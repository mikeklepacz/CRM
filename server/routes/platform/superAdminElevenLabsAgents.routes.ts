import type { Express } from "express";
import axios from "axios";
import { elevenLabsAgentSchema } from "../../services/callManager/elevenLabsSchemas";
import { storage } from "../../storage";

export function registerSuperAdminElevenLabsAgentsRoutes(
  app: Express,
  deps: {
    requireSuperAdmin: any;
    syncAgentSettingsFromElevenLabs: (agentId: string, elevenLabsAgentId: string, tenantId: string, storageInstance: typeof storage) => Promise<void>;
  }
): void {
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
    } catch (error: any) {
      console.error("Error fetching ElevenLabs agents:", error);
      res.status(500).json({ message: error.message || "Failed to fetch agents" });
    }
  });

  app.get(
    "/api/super-admin/tenants/:tenantId/elevenlabs/phone-numbers",
    deps.requireSuperAdmin,
    async (req: any, res) => {
      try {
        const { tenantId } = req.params;
        const phoneNumbers = await storage.getAllElevenLabsPhoneNumbers(tenantId);
        res.json(phoneNumbers);
      } catch (error: any) {
        console.error("Error fetching phone numbers:", error);
        res.status(500).json({ error: error.message || "Internal server error" });
      }
    }
  );

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
    } catch (error: any) {
      console.error("Error creating ElevenLabs agent:", error);
      res.status(500).json({ message: error.message || "Failed to create agent" });
    }
  });

  app.put(
    "/api/super-admin/tenants/:tenantId/elevenlabs/agents/:id",
    deps.requireSuperAdmin,
    async (req: any, res) => {
      try {
        const { tenantId, id } = req.params;
        const validation = elevenLabsAgentSchema.partial().safeParse(req.body);
        if (!validation.success) {
          return res.status(400).json({ message: validation.error.errors[0].message });
        }

        const agent = await storage.updateElevenLabsAgent(id, tenantId, validation.data);
        res.json(agent);
      } catch (error: any) {
        console.error("Error updating ElevenLabs agent:", error);
        res.status(500).json({ message: error.message || "Failed to update agent" });
      }
    }
  );

  app.delete(
    "/api/super-admin/tenants/:tenantId/elevenlabs/agents/:id",
    deps.requireSuperAdmin,
    async (req: any, res) => {
      try {
        const { tenantId, id } = req.params;
        await storage.deleteElevenLabsAgent(id, tenantId);
        res.json({ message: "Agent deleted successfully" });
      } catch (error: any) {
        console.error("Error deleting ElevenLabs agent:", error);
        res.status(500).json({ message: error.message || "Failed to delete agent" });
      }
    }
  );

  app.put(
    "/api/super-admin/tenants/:tenantId/elevenlabs/agents/:id/set-default",
    deps.requireSuperAdmin,
    async (req: any, res) => {
      try {
        const { tenantId, id } = req.params;
        await storage.setDefaultElevenLabsAgent(id, tenantId);
        res.json({ message: "Default agent set successfully" });
      } catch (error: any) {
        console.error("Error setting default agent:", error);
        res.status(500).json({ message: error.message || "Failed to set default agent" });
      }
    }
  );

  app.post(
    "/api/super-admin/tenants/:tenantId/elevenlabs/agents/:id/sync-settings",
    deps.requireSuperAdmin,
    async (req: any, res) => {
      try {
        const { tenantId, id } = req.params;

        const dbAgent = await storage.getElevenLabsAgent(id, tenantId);
        if (!dbAgent) {
          return res.status(404).json({ message: "Agent not found" });
        }

        const config = await storage.getElevenLabsConfig(tenantId);
        if (!config?.apiKey) {
          return res.status(400).json({ message: "ElevenLabs API key not configured" });
        }

        const response = await axios.get(`https://api.elevenlabs.io/v1/convai/agents/${dbAgent.agentId}`, {
          headers: { "xi-api-key": config.apiKey },
        });

        const agentData = response.data;
        const conversationConfig = agentData.conversation_config || {};
        const ttsConfig = conversationConfig.tts || {};
        const sttConfig = conversationConfig.stt || {};

        await storage.updateElevenLabsAgent(id, tenantId, {
          sttEncoding: sttConfig.encoding || null,
          sttSampleRate: sttConfig.sample_rate || null,
          ttsOutputFormat: ttsConfig.agent_output_audio_format || null,
          voiceId: ttsConfig.voice_id || null,
          language: conversationConfig.language || null,
          lastSyncedAt: new Date(),
        });

        const updatedAgent = await storage.getElevenLabsAgent(id, tenantId);
        res.json(updatedAgent);
      } catch (error: any) {
        console.error("Error syncing agent settings:", error);
        res.status(500).json({ message: error.message || "Failed to sync agent settings" });
      }
    }
  );

  app.post(
    "/api/super-admin/tenants/:tenantId/elevenlabs/sync-all-agent-settings",
    deps.requireSuperAdmin,
    async (req: any, res) => {
      try {
        const { tenantId } = req.params;

        const config = await storage.getElevenLabsConfig(tenantId);
        if (!config?.apiKey) {
          return res.status(400).json({ message: "ElevenLabs API key not configured" });
        }

        const agents = await storage.getAllElevenLabsAgents(tenantId);
        const results = { success: 0, failed: 0, errors: [] as string[] };

        for (const dbAgent of agents) {
          try {
            const response = await axios.get(`https://api.elevenlabs.io/v1/convai/agents/${dbAgent.agentId}`, {
              headers: { "xi-api-key": config.apiKey },
            });

            const agentData = response.data;
            const conversationConfig = agentData.conversation_config || {};
            const ttsConfig = conversationConfig.tts || {};
            const sttConfig = conversationConfig.stt || {};

            await storage.updateElevenLabsAgent(dbAgent.id, tenantId, {
              sttEncoding: sttConfig.encoding || null,
              sttSampleRate: sttConfig.sample_rate || null,
              ttsOutputFormat: ttsConfig.agent_output_audio_format || null,
              voiceId: ttsConfig.voice_id || null,
              language: conversationConfig.language || null,
              lastSyncedAt: new Date(),
            });

            results.success++;
          } catch (err: any) {
            results.failed++;
            results.errors.push(`${dbAgent.name || dbAgent.agentId}: ${err.message}`);
          }
        }

        res.json(results);
      } catch (error: any) {
        console.error("Error syncing all agent settings:", error);
        res.status(500).json({ message: error.message || "Failed to sync agent settings" });
      }
    }
  );

  app.post(
    "/api/super-admin/tenants/:tenantId/elevenlabs/sync-phone-numbers",
    deps.requireSuperAdmin,
    async (req: any, res) => {
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
              } catch (err: any) {
                console.error(`[PhoneSync] Failed to update agent ${assignedAgentId}:`, err.message);
              }
            }
          }
        }

        res.json({ message: `Phone numbers synced successfully (${agentUpdates} agent(s) updated)`, count: phoneNumbers.length });
      } catch (error: any) {
        console.error("Error syncing phone numbers:", error);
        res.status(500).json({ message: error.message || "Failed to sync phone numbers" });
      }
    }
  );
}
