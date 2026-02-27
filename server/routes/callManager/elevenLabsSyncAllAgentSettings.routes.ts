import type { Express } from "express";
import axios from "axios";
import { storage } from "../../storage";
import type { ElevenLabsAgentsSyncDeps } from "./elevenLabsAgentsSync.types";

export function registerElevenLabsSyncAllAgentSettingsRoute(app: Express, deps: ElevenLabsAgentsSyncDeps): void {
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
}
