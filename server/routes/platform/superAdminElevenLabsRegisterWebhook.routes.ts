import type { Express } from "express";
import { formatWebhookRegistrationError, registerWebhookIfMissing, resolveElevenLabsWebhookUrl } from "../../services/callManager/elevenLabsWebhookService";
import { storage } from "../../storage";
import type { SuperAdminElevenLabsConfigWebhookDeps } from "./superAdminElevenLabsConfigWebhook.types";

export function registerSuperAdminElevenLabsRegisterWebhookRoute(app: Express, deps: SuperAdminElevenLabsConfigWebhookDeps): void {
  app.post(
    "/api/super-admin/tenants/:tenantId/elevenlabs/register-webhook",
    deps.requireSuperAdmin,
    async (req: any, res) => {
      try {
        const { tenantId } = req.params;
        const config = await storage.getElevenLabsConfig(tenantId);

        if (!config?.apiKey) {
          return res.status(400).json({ message: "ElevenLabs API key not configured for this tenant" });
        }

        const webhookUrl = resolveElevenLabsWebhookUrl(req.get("host"));
        const result = await registerWebhookIfMissing(tenantId, config.apiKey, webhookUrl);

        if (result.alreadyRegistered) {
          return res.json({
            message: "Webhook already registered",
            webhookUrl,
            webhookId: result.webhookId,
            events: result.events,
          });
        }

        res.json({
          message: "Webhook registered successfully",
          webhookUrl,
          webhookId: result.webhookId,
          events: result.events,
        });
      } catch (error: any) {
        const formatted = formatWebhookRegistrationError(error);
        console.error("Error registering webhook:", formatted.message, formatted.details);
        res.status(formatted.status).json({ message: formatted.message, details: formatted.details });
      }
    }
  );
}
