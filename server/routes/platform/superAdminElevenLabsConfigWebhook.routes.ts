import type { Express } from "express";
import { elevenLabsConfigSchema } from "../../services/callManager/elevenLabsSchemas";
import {
  ensureWebhookRegistration,
  formatWebhookRegistrationError,
  registerWebhookIfMissing,
  resolveElevenLabsWebhookUrl,
} from "../../services/callManager/elevenLabsWebhookService";
import { storage } from "../../storage";

export function registerSuperAdminElevenLabsConfigWebhookRoutes(
  app: Express,
  deps: { requireSuperAdmin: any }
): void {
  app.get("/api/super-admin/tenants/:tenantId/elevenlabs/config", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const config = await storage.getElevenLabsConfig(tenantId);
      res.json(config || { apiKey: "", twilioNumber: "" });
    } catch (error: any) {
      console.error("Error fetching ElevenLabs config:", error);
      res.status(500).json({ message: error.message || "Failed to fetch config" });
    }
  });

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

  app.get("/api/super-admin/tenants/:tenantId/elevenlabs-config", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const config = await storage.getElevenLabsConfig(tenantId);
      res.json({ useDirectElevenLabs: config?.useDirectElevenLabs ?? false });
    } catch (error: any) {
      console.error("Error fetching Direct ElevenLabs setting:", error);
      res.status(500).json({ message: error.message || "Failed to fetch setting" });
    }
  });

  app.patch("/api/super-admin/tenants/:tenantId/elevenlabs-config", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const { useDirectElevenLabs } = req.body;

      if (typeof useDirectElevenLabs !== "boolean") {
        return res.status(400).json({ message: "useDirectElevenLabs must be a boolean" });
      }

      await storage.updateElevenLabsConfigDirectMode(tenantId, useDirectElevenLabs);
      res.json({ message: "Direct ElevenLabs setting updated successfully", useDirectElevenLabs });
    } catch (error: any) {
      console.error("Error updating Direct ElevenLabs setting:", error);
      res.status(500).json({ message: error.message || "Failed to update setting" });
    }
  });

  app.get(
    "/api/super-admin/tenants/:tenantId/elevenlabs/webhook-status",
    deps.requireSuperAdmin,
    async (req: any, res) => {
      try {
        const { tenantId } = req.params;
        const config = await storage.getElevenLabsConfig(tenantId);
        const webhookUrl = resolveElevenLabsWebhookUrl(req.get("host"));

        res.json({
          webhookUrl,
          hasSecret: !!config?.webhookSecret,
          hasApiKey: !!config?.apiKey,
        });
      } catch (error: any) {
        console.error("Error fetching webhook status:", error);
        res.status(500).json({ message: error.message || "Failed to fetch webhook status" });
      }
    }
  );

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
