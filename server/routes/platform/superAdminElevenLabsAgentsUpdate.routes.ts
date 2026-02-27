import type { Express } from "express";
import type { SuperAdminElevenLabsAgentsRouteDeps } from "./superAdminElevenLabsAgents.types";
import { elevenLabsAgentSchema } from "../../services/callManager/elevenLabsSchemas";
import { storage } from "../../storage";

export function registerSuperAdminElevenLabsAgentsUpdateRoute(app: Express, deps: SuperAdminElevenLabsAgentsRouteDeps): void {
  app.put("/api/super-admin/tenants/:tenantId/elevenlabs/agents/:id", deps.requireSuperAdmin, async (req: any, res) => {
      try {
          const { tenantId, id } = req.params;
          const validation = elevenLabsAgentSchema.partial().safeParse(req.body);
          if (!validation.success) {
              return res.status(400).json({ message: validation.error.errors[0].message });
          }
          const agent = await storage.updateElevenLabsAgent(id, tenantId, validation.data);
          res.json(agent);
      }
      catch (error: any) {
          console.error("Error updating ElevenLabs agent:", error);
          res.status(500).json({ message: error.message || "Failed to update agent" });
      }
  });
}
