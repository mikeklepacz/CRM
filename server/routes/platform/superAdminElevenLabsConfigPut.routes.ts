import type { Express } from "express";
import { elevenLabsConfigSchema } from "../../services/callManager/elevenLabsSchemas";
import { ensureWebhookRegistration, resolveElevenLabsWebhookUrl } from "../../services/callManager/elevenLabsWebhookService";
import { storage } from "../../storage";
import type { SuperAdminElevenLabsConfigWebhookDeps } from "./superAdminElevenLabsConfigWebhook.types";

export function registerSuperAdminElevenLabsConfigPutRoute(app: Express, deps: SuperAdminElevenLabsConfigWebhookDeps): void {
  app.put("/api/super-admin/tenants/:tenantId/elevenlabs/config", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const validation = elevenLabsConfigSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const existingConfig = await storage.getElevenLabsConfig(tenantId);
      const apiKeyChanged = validation.data.apiKey && validation.data.apiKey !== existingConfig?.apiKey;

      await storage.updateElevenLabsConfig(tenantId, validation.data);

      let webhookRegistered = false;
      let webhookError: string | null = null;

      if (validation.data.apiKey && (apiKeyChanged || !existingConfig?.webhookSecret)) {
        const webhookUrl = resolveElevenLabsWebhookUrl(req.get("host"));
        const result = await ensureWebhookRegistration(tenantId, validation.data.apiKey, webhookUrl);
        webhookRegistered = result.webhookRegistered;
        webhookError = result.webhookError;
      }

      res.json({ message: "ElevenLabs configuration updated successfully", webhookRegistered, webhookError });
    } catch (error: any) {
      console.error("Error updating ElevenLabs config:", error);
      res.status(500).json({ message: error.message || "Failed to update config" });
    }
  });
}
