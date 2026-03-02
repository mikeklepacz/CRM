import type { Express } from "express";
import type { SuperAdminElevenLabsAgentsRouteDeps } from "./superAdminElevenLabsAgents.types";
import { elevenLabsAgentSchema } from "../../services/callManager/elevenLabsSchemas";
import { storage } from "../../storage";

export function registerSuperAdminElevenLabsAgentsCreateRoute(app: Express, deps: SuperAdminElevenLabsAgentsRouteDeps): void {
  app.post("/api/super-admin/tenants/:tenantId/elevenlabs/agents", deps.requireSuperAdmin, async (req: any, res) => {
      try {
          const { tenantId } = req.params;
          const validation = elevenLabsAgentSchema.safeParse(req.body);
          if (!validation.success) {
              return res.status(400).json({ message: validation.error.errors[0].message });
          }
          const agentData = {
              ...validation.data,
              tenantId,
              projectId: validation.data.projectId || null,
          };
          const agent = await storage.createElevenLabsAgent(agentData);
          deps
              .syncAgentSettingsFromElevenLabs(agent.id, agent.agentId, tenantId, storage)
              .catch((err) => console.error("[Agent Auto-Sync] Background sync failed:", err.message));
          res.json(agent);
      }
      catch (error: any) {
          console.error("Error creating ElevenLabs agent:", error);
          res.status(500).json({ message: error.message || "Failed to create agent" });
      }
  });
}
