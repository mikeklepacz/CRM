import type { Express } from "express";
import type { SuperAdminElevenLabsAgentsRouteDeps } from "./superAdminElevenLabsAgents.types";
import { storage } from "../../storage";

export function registerSuperAdminElevenLabsAgentsSetDefaultRoute(app: Express, deps: SuperAdminElevenLabsAgentsRouteDeps): void {
  app.put("/api/super-admin/tenants/:tenantId/elevenlabs/agents/:id/set-default", deps.requireSuperAdmin, async (req: any, res) => {
      try {
          const { tenantId, id } = req.params;
          await storage.setDefaultElevenLabsAgent(id, tenantId);
          res.json({ message: "Default agent set successfully" });
      }
      catch (error: any) {
          console.error("Error setting default agent:", error);
          res.status(500).json({ message: error.message || "Failed to set default agent" });
      }
  });
}
