import type { Express } from "express";
import type { SuperAdminElevenLabsAgentsRouteDeps } from "./superAdminElevenLabsAgents.types";
import { storage } from "../../storage";

export function registerSuperAdminElevenLabsAgentsDeleteRoute(app: Express, deps: SuperAdminElevenLabsAgentsRouteDeps): void {
  app.delete("/api/super-admin/tenants/:tenantId/elevenlabs/agents/:id", deps.requireSuperAdmin, async (req: any, res) => {
      try {
          const { tenantId, id } = req.params;
          await storage.deleteElevenLabsAgent(id, tenantId);
          res.json({ message: "Agent deleted successfully" });
      }
      catch (error: any) {
          console.error("Error deleting ElevenLabs agent:", error);
          res.status(500).json({ message: error.message || "Failed to delete agent" });
      }
  });
}
