import type { Express } from "express";
import { formatWebhookRegistrationError, registerWebhookIfMissing, resolveElevenLabsWebhookUrl } from "../../services/callManager/elevenLabsWebhookService";
import { storage } from "../../storage";
import type { ElevenLabsConfigWebhookAdminDeps } from "./elevenLabsConfigWebhookAdmin.types";

export function registerElevenLabsRegisterWebhookRoute(app: Express, deps: ElevenLabsConfigWebhookAdminDeps): void {
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
}
