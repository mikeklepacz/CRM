import type { Express } from "express";
import axios from "axios";
import { storage } from "../../storage";
import type { ElevenLabsAgentsSyncDeps } from "./elevenLabsAgentsSync.types";

export function registerElevenLabsAgentSyncSettingsRoute(app: Express, deps: ElevenLabsAgentsSyncDeps): void {
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
}
