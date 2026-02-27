import type { Express } from "express";
import { storage } from "../../storage";
import type { ElevenLabsAgentsAdminDeps } from "./elevenLabsAgentsAdmin.types";

export function registerElevenLabsAgentsSetDefaultRoute(app: Express, deps: ElevenLabsAgentsAdminDeps): void {
  app.put("/api/elevenlabs/agents/:id/set-default", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      await storage.setDefaultElevenLabsAgent(req.params.id, req.user.tenantId);
      res.json({ message: "Default agent set successfully" });
    } catch (error: any) {
      console.error("Error setting default agent:", error);
      res.status(500).json({ message: error.message || "Failed to set default agent" });
    }
  });
}
