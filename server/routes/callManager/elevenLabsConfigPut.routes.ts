import type { Express } from "express";
import { elevenLabsConfigSchema } from "../../services/callManager/elevenLabsSchemas";
import { ensureWebhookRegistration, resolveElevenLabsWebhookUrl } from "../../services/callManager/elevenLabsWebhookService";
import { storage } from "../../storage";
import type { ElevenLabsConfigWebhookAdminDeps } from "./elevenLabsConfigWebhookAdmin.types";

export function registerElevenLabsConfigPutRoute(app: Express, deps: ElevenLabsConfigWebhookAdminDeps): void {
  app.put("/api/elevenlabs/config", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const validation = elevenLabsConfigSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const existingConfig = await storage.getElevenLabsConfig(req.user.tenantId);
      const apiKeyChanged = validation.data.apiKey && validation.data.apiKey !== existingConfig?.apiKey;

      await storage.updateElevenLabsConfig(req.user.tenantId, validation.data);

      let webhookRegistered = false;
      let webhookError: string | null = null;

      if (validation.data.apiKey && (apiKeyChanged || !existingConfig?.webhookSecret)) {
        const webhookUrl = resolveElevenLabsWebhookUrl(req.get("host"));
        const result = await ensureWebhookRegistration(req.user.tenantId, validation.data.apiKey, webhookUrl);
        webhookRegistered = result.webhookRegistered;
        webhookError = result.webhookError;
      }

      res.json({
        message: "ElevenLabs configuration updated successfully",
        webhookRegistered,
        webhookError,
      });
    } catch (error: any) {
      console.error("Error updating ElevenLabs config:", error);
      res.status(500).json({ message: error.message || "Failed to update config" });
    }
  });
}
