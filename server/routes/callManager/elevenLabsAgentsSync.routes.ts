import type { Express } from "express";
import axios from "axios";
import { storage } from "../../storage";

export function registerCallManagerElevenLabsAgentsSyncRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any }
): void {
  app.post("/api/elevenlabs/agents/:id/sync-settings", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;

      const localAgent = await storage.getElevenLabsAgent(id, tenantId);
      if (!localAgent) {
        return res.status(404).json({ error: "Agent not found" });
      }

      const config = await storage.getElevenLabsConfig(tenantId);
      if (!config?.apiKey) {
        return res.status(400).json({ error: "ElevenLabs API key not configured" });
      }

      const response = await axios.get(`https://api.elevenlabs.io/v1/convai/agents/${localAgent.agentId}`, {
        headers: { "xi-api-key": config.apiKey },
      });

      const elData = response.data;
      const conversationConfig = elData.conversation_config || {};
      const ttsConfig = conversationConfig.tts || {};
      const sttConfig = conversationConfig.stt || {};

      const audioSettings = {
        sttEncoding: sttConfig.encoding || sttConfig.input_format || "pcm_s16le",
        sttSampleRate: sttConfig.sample_rate || 16000,
        ttsOutputFormat: ttsConfig.output_format || "pcm_16000",
        voiceId: ttsConfig.voice_id || elData.voice?.voice_id || null,
        language: conversationConfig.agent?.language || elData.language || null,
        lastSyncedAt: new Date(),
      };

      const updatedAgent = await storage.updateElevenLabsAgent(id, tenantId, audioSettings);
      res.json({ message: "Settings synced successfully", agent: updatedAgent, syncedSettings: audioSettings });
    } catch (error: any) {
      console.error("[Agent Sync] Error syncing agent settings:", error.response?.data || error.message);
      res.status(500).json({ error: error.response?.data?.detail?.message || error.message || "Failed to sync agent settings" });
    }
  });

  app.post("/api/elevenlabs/sync-all-agent-settings", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const config = await storage.getElevenLabsConfig(tenantId);
      if (!config?.apiKey) {
        return res.status(400).json({ error: "ElevenLabs API key not configured" });
      }

      const agents = await storage.getAllElevenLabsAgents(tenantId);
      const results = { synced: 0, failed: 0, errors: [] as string[] };

      for (const agent of agents) {
        try {
          const response = await axios.get(`https://api.elevenlabs.io/v1/convai/agents/${agent.agentId}`, {
            headers: { "xi-api-key": config.apiKey },
          });

          const elData = response.data;
          const conversationConfig = elData.conversation_config || {};
          const ttsConfig = conversationConfig.tts || {};
          const sttConfig = conversationConfig.stt || {};

          await storage.updateElevenLabsAgent(agent.id, tenantId, {
            sttEncoding: sttConfig.encoding || sttConfig.input_format || "pcm_s16le",
            sttSampleRate: sttConfig.sample_rate || 16000,
            ttsOutputFormat: ttsConfig.output_format || "pcm_16000",
            voiceId: ttsConfig.voice_id || elData.voice?.voice_id || null,
            language: conversationConfig.agent?.language || elData.language || null,
            lastSyncedAt: new Date(),
          });

          results.synced++;
        } catch (err: any) {
          results.failed++;
          results.errors.push(`${agent.name}: ${err.message}`);
        }
      }

      res.json({ message: `Synced ${results.synced}/${agents.length} agents`, ...results });
    } catch (error: any) {
      console.error("[Agent Sync] Error syncing all agents:", error);
      res.status(500).json({ error: error.message || "Failed to sync agents" });
    }
  });

  app.post("/api/elevenlabs/sync-phone-numbers", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const config = await storage.getElevenLabsConfig(req.user.tenantId);
      if (!config?.apiKey) {
        return res.status(400).json({ error: "ElevenLabs API key not configured" });
      }

      const response = await axios.get("https://api.elevenlabs.io/v1/convai/phone-numbers/", {
        headers: { "xi-api-key": config.apiKey },
      });

      const phoneNumbers = Array.isArray(response.data) ? response.data : (response.data.phone_numbers ?? []);
      if (!phoneNumbers || phoneNumbers.length === 0) {
        return res.json({ message: "No phone numbers found in ElevenLabs account", phoneNumbers: [] });
      }

      for (const phone of phoneNumbers) {
        await storage.upsertElevenLabsPhoneNumber({
          phoneNumberId: phone.phone_number_id,
          phoneNumber: phone.number || phone.phone_number || "",
          label: phone.label || phone.name || null,
          agentId: phone.agent_id || null,
          tenantId: req.user.tenantId,
        } as any);
      }

      const allAgents = await storage.getAllElevenLabsAgents(req.user.tenantId);
      const agentIdToDbId = new Map(allAgents.map((a) => [a.agentId, a.id]));

      let agentUpdates = 0;
      for (const phone of phoneNumbers) {
        const assignedAgentId = phone.assigned_agent?.agent_id || phone.agent_id;
        if (assignedAgentId && phone.phone_number_id) {
          const dbAgentId = agentIdToDbId.get(assignedAgentId);
          if (dbAgentId) {
            try {
              await storage.updateElevenLabsAgent(dbAgentId, req.user.tenantId, { phoneNumberId: phone.phone_number_id });
              agentUpdates++;
            } catch (err: any) {
              console.error(`[PhoneSync] Failed to update agent ${assignedAgentId}:`, err.message);
            }
          }
        }
      }

      res.json({
        message: `Successfully synced ${phoneNumbers.length} phone number(s) from ElevenLabs (${agentUpdates} agent(s) updated)`,
        phoneNumbers: phoneNumbers.map((pn: any) => ({
          phone_number: pn.phone_number || pn.number,
          phone_number_id: pn.phone_number_id,
          provider: pn.provider,
          label: pn.label || pn.name,
          agent_id: pn.agent_id,
        })),
      });
    } catch (error: any) {
      console.error("[PhoneSync] Error syncing phone numbers:", error.response?.data || error.message);
      res.status(500).json({
        error: error.message || "Failed to sync phone numbers",
        details: error.response?.data,
      });
    }
  });
}
