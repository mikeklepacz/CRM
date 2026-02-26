import axios from "axios";

const FLY_VOICE_PROXY_HEALTH_URL =
  process.env.FLY_VOICE_PROXY_HEALTH_URL || "https://hemp-voice-proxy.fly.dev/health";

export async function syncAgentSettingsFromElevenLabs(
  agentId: string,
  elevenLabsAgentId: string,
  tenantId: string,
  storageInstance: any
): Promise<void> {
  try {
    const config = await storageInstance.getElevenLabsConfig(tenantId);
    if (!config?.apiKey) {
      console.log(`[Agent Auto-Sync] Skipping sync for agent ${agentId} - no API key configured`);
      return;
    }

    console.log(`[Agent Auto-Sync] Fetching settings for agent ${elevenLabsAgentId} from ElevenLabs...`);
    const response = await axios.get(`https://api.elevenlabs.io/v1/convai/agents/${elevenLabsAgentId}`, {
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

    await storageInstance.updateElevenLabsAgent(agentId, tenantId, audioSettings);
    console.log(`[Agent Auto-Sync] Successfully synced settings for agent ${elevenLabsAgentId}:`, audioSettings);
  } catch (error: any) {
    console.error(`[Agent Auto-Sync] Failed to sync settings for agent ${elevenLabsAgentId}:`, error.message);
  }
}

export async function checkFlyVoiceProxyHealth(): Promise<{ healthy: boolean; details?: any }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(FLY_VOICE_PROXY_HEALTH_URL, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { healthy: false, details: { error: `HTTP ${response.status}` } };
    }

    const data = await response.json();
    return {
      healthy: data.status === "ok",
      details: data,
    };
  } catch (error: any) {
    return {
      healthy: false,
      details: { error: error.message || "Connection failed" },
    };
  }
}
