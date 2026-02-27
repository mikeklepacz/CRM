import type { Express } from "express";
import { storage } from "../../storage";
import type { SuperAdminElevenLabsConfigWebhookDeps } from "./superAdminElevenLabsConfigWebhook.types";

export function registerSuperAdminDirectElevenLabsConfigGetRoute(app: Express, deps: SuperAdminElevenLabsConfigWebhookDeps): void {
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
}
