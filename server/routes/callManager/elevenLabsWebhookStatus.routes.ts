import type { Express } from "express";
import { resolveElevenLabsWebhookUrl } from "../../services/callManager/elevenLabsWebhookService";
import { storage } from "../../storage";
import type { ElevenLabsConfigWebhookAdminDeps } from "./elevenLabsConfigWebhookAdmin.types";

export function registerElevenLabsWebhookStatusRoute(app: Express, deps: ElevenLabsConfigWebhookAdminDeps): void {
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
