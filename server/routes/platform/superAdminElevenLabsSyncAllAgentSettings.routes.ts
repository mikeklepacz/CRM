import type { Express } from "express";
import type { SuperAdminElevenLabsAgentsRouteDeps } from "./superAdminElevenLabsAgents.types";
import axios from "axios";
import { storage } from "../../storage";

export function registerSuperAdminElevenLabsSyncAllAgentSettingsRoute(app: Express, deps: SuperAdminElevenLabsAgentsRouteDeps): void {
  app.post("/api/super-admin/tenants/:tenantId/elevenlabs/sync-all-agent-settings", deps.requireSuperAdmin, async (req: any, res) => {
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
              }
              catch (err: any) {
                  results.failed++;
                  results.errors.push(`${dbAgent.name || dbAgent.agentId}: ${err.message}`);
              }
          }
          res.json(results);
      }
      catch (error: any) {
          console.error("Error syncing all agent settings:", error);
          res.status(500).json({ message: error.message || "Failed to sync agent settings" });
      }
  });
}
