import type { Express } from "express";
import type { SuperAdminElevenLabsAgentsRouteDeps } from "./superAdminElevenLabsAgents.types";
import axios from "axios";
import { storage } from "../../storage";

export function registerSuperAdminElevenLabsSyncPhoneNumbersRoute(app: Express, deps: SuperAdminElevenLabsAgentsRouteDeps): void {
  app.post("/api/super-admin/tenants/:tenantId/elevenlabs/sync-phone-numbers", deps.requireSuperAdmin, async (req: any, res) => {
      try {
          const { tenantId } = req.params;
          const config = await storage.getElevenLabsConfig(tenantId);
          if (!config?.apiKey) {
              return res.status(400).json({ message: "ElevenLabs API key not configured for this tenant" });
          }
          const response = await axios.get("https://api.elevenlabs.io/v1/convai/phone-numbers", {
              headers: { "xi-api-key": config.apiKey },
          });
          const phoneNumbers = response.data.phone_numbers || (Array.isArray(response.data) ? response.data : []);
          for (const pn of phoneNumbers) {
              await storage.upsertElevenLabsPhoneNumber({
                  phoneNumberId: pn.phone_number_id,
                  phoneNumber: pn.phone_number || pn.number || "",
                  label: pn.label || pn.name || null,
                  tenantId,
              });
          }
          const allAgents = await storage.getAllElevenLabsAgents(tenantId);
          const agentIdToDbId = new Map(allAgents.map((a) => [a.agentId, a.id]));
          let agentUpdates = 0;
          for (const pn of phoneNumbers) {
              const assignedAgentId = pn.assigned_agent?.agent_id || pn.agent_id;
              if (assignedAgentId && pn.phone_number_id) {
                  const dbAgentId = agentIdToDbId.get(assignedAgentId);
                  if (dbAgentId) {
                      try {
                          await storage.updateElevenLabsAgent(dbAgentId, tenantId, {
                              phoneNumberId: pn.phone_number_id,
                          });
                          agentUpdates++;
                      }
                      catch (err: any) {
                          console.error(`[PhoneSync] Failed to update agent ${assignedAgentId}:`, err.message);
                      }
                  }
              }
          }
          res.json({ message: `Phone numbers synced successfully (${agentUpdates} agent(s) updated)`, count: phoneNumbers.length });
      }
      catch (error: any) {
          console.error("Error syncing phone numbers:", error);
          res.status(500).json({ message: error.message || "Failed to sync phone numbers" });
      }
  });
}
