import type { Express } from "express";
import { elevenLabsConfigSchema } from "../../services/callManager/elevenLabsSchemas";
import {
  ensureWebhookRegistration,
  formatWebhookRegistrationError,
  registerWebhookIfMissing,
  resolveElevenLabsWebhookUrl,
} from "../../services/callManager/elevenLabsWebhookService";
import { storage } from "../../storage";

export function registerCallManagerElevenLabsConfigWebhookAdminRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any }
): void {
  app.get("/api/elevenlabs/config", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const config = await storage.getElevenLabsConfig(req.user.tenantId);
      res.json(config || { apiKey: "", twilioNumber: "" });
    } catch (error: any) {
      console.error("Error fetching ElevenLabs config:", error);
      res.status(500).json({ message: error.message || "Failed to fetch config" });
    }
  });

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

  app.post("/api/elevenlabs/register-webhook", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const config = await storage.getElevenLabsConfig(req.user.tenantId);
      if (!config?.apiKey) {
        return res.status(400).json({ message: "ElevenLabs API key not configured" });
      }

      const webhookUrl = resolveElevenLabsWebhookUrl();
      const result = await registerWebhookIfMissing(req.user.tenantId, config.apiKey, webhookUrl);

      if (result.alreadyRegistered) {
        return res.json({
          message: "Webhook already registered",
          url: webhookUrl,
          webhookId: result.webhookId,
          events: result.events,
        });
      }

      res.json({
        message: "Webhook registered successfully",
        url: webhookUrl,
        webhookId: result.webhookId,
        events: result.events,
      });
    } catch (error: any) {
      const formatted = formatWebhookRegistrationError(error);
      console.error("Error registering webhook:", formatted.message, formatted.details);
      res.status(formatted.status).json({ message: formatted.message, details: formatted.details });
    }
  });

  app.get("/api/elevenlabs/webhook-status", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const config = await storage.getElevenLabsConfig(req.user.tenantId);
      let webhookUrl: string | null = null;
      try {
        webhookUrl = resolveElevenLabsWebhookUrl(req.get("host"));
      } catch {
        webhookUrl = null;
      }

      res.json({
        webhookUrl,
        hasSecret: !!config?.webhookSecret,
        hasApiKey: !!config?.apiKey,
      });
    } catch (error: any) {
      console.error("Error fetching webhook status:", error);
      res.status(500).json({ message: error.message || "Failed to fetch webhook status" });
    }
  });
}
