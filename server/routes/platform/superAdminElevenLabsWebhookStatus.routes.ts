import type { Express } from "express";
import { resolveElevenLabsWebhookUrl } from "../../services/callManager/elevenLabsWebhookService";
import { storage } from "../../storage";
import type { SuperAdminElevenLabsConfigWebhookDeps } from "./superAdminElevenLabsConfigWebhook.types";

export function registerSuperAdminElevenLabsWebhookStatusRoute(app: Express, deps: SuperAdminElevenLabsConfigWebhookDeps): void {
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
}
