import type { Express } from "express";
import type { SuperAdminElevenLabsAgentsRouteDeps } from "./superAdminElevenLabsAgents.types";
import { storage } from "../../storage";

export function registerSuperAdminElevenLabsAgentsListRoute(app: Express, deps: SuperAdminElevenLabsAgentsRouteDeps): void {
  app.get("/api/super-admin/tenants/:tenantId/elevenlabs/agents", deps.requireSuperAdmin, async (req: any, res) => {
      try {
          const { tenantId } = req.params;
          const agents = await storage.getAllElevenLabsAgents(tenantId);
          const phoneNumbers = await storage.getAllElevenLabsPhoneNumbers(tenantId);
          const projects = await storage.listTenantProjects(tenantId);
          const phoneByIdMap = new Map(phoneNumbers.map((pn) => [pn.phoneNumberId, pn]));
          const projectMap = new Map(projects.map((p) => [p.id, p.name]));
          const enrichedAgents = agents.map((agent) => {
              const phone = agent.phoneNumberId ? phoneByIdMap.get(agent.phoneNumberId) : null;
              return {
                  id: agent.id,
                  name: agent.name,
                  agent_id: agent.agentId,
                  phone_number_id: agent.phoneNumberId,
                  phone_number: phone?.phoneNumber || null,
                  phone_label: phone?.label || null,
                  description: agent.description,
                  is_default: agent.isDefault,
                  projectId: agent.projectId || null,
                  projectName: agent.projectId ? projectMap.get(agent.projectId) || null : null,
              };
          });
          res.json(enrichedAgents);
      }
      catch (error: any) {
          console.error("Error fetching ElevenLabs agents:", error);
          res.status(500).json({ message: error.message || "Failed to fetch agents" });
      }
  });
}
