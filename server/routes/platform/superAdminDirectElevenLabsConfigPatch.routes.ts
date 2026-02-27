import type { Express } from "express";
import { storage } from "../../storage";
import type { SuperAdminElevenLabsConfigWebhookDeps } from "./superAdminElevenLabsConfigWebhook.types";

export function registerSuperAdminDirectElevenLabsConfigPatchRoute(app: Express, deps: SuperAdminElevenLabsConfigWebhookDeps): void {
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
}
