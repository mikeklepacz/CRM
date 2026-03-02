import type { Express } from "express";
import { storage } from "../../storage";
import type { ElevenLabsAgentsAdminDeps } from "./elevenLabsAgentsAdmin.types";

export function registerElevenLabsAgentsDeleteRoute(app: Express, deps: ElevenLabsAgentsAdminDeps): void {
  app.delete("/api/elevenlabs/agents/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      await storage.deleteElevenLabsAgent(req.params.id, req.user.tenantId);
      res.json({ message: "Agent deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting ElevenLabs agent:", error);
      res.status(500).json({ message: error.message || "Failed to delete agent" });
    }
  });
}
