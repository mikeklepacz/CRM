import type { Express } from "express";
import type { SuperAdminElevenLabsAgentsRouteDeps } from "./superAdminElevenLabsAgents.types";
import axios from "axios";
import { storage } from "../../storage";

export function registerSuperAdminElevenLabsAgentsSyncSettingsRoute(app: Express, deps: SuperAdminElevenLabsAgentsRouteDeps): void {
  app.post("/api/super-admin/tenants/:tenantId/elevenlabs/agents/:id/sync-settings", deps.requireSuperAdmin, async (req: any, res) => {
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
      }
      catch (error: any) {
          console.error("Error syncing agent settings:", error);
          res.status(500).json({ message: error.message || "Failed to sync agent settings" });
      }
  });
}
