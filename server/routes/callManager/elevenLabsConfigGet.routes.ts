import type { Express } from "express";
import { storage } from "../../storage";
import type { ElevenLabsConfigWebhookAdminDeps } from "./elevenLabsConfigWebhookAdmin.types";

export function registerElevenLabsConfigGetRoute(app: Express, deps: ElevenLabsConfigWebhookAdminDeps): void {
  app.get("/api/elevenlabs/config", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const config = await storage.getElevenLabsConfig(req.user.tenantId);
      res.json(config || { apiKey: "", twilioNumber: "" });
    } catch (error: any) {
      console.error("Error fetching ElevenLabs config:", error);
      res.status(500).json({ message: error.message || "Failed to fetch config" });
    }
  });
}
