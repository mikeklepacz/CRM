import multer from "multer";

export const FLY_PROXY_SECRET = process.env.FLY_PROXY_SECRET || "hemp-voice-proxy-secret-2024";
export const FLY_VOICE_PROXY_CONFIG_URL = process.env.FLY_VOICE_PROXY_CONFIG_URL || "https://hemp-voice-proxy.fly.dev/config";

export const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export async function notifyFlyProxy(config: { action?: string; volumeDb?: number; audioUrl?: string }) {
  try {
    const response = await fetch(FLY_VOICE_PROXY_CONFIG_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FLY_PROXY_SECRET}`,
      },
      body: JSON.stringify(config),
    });

    if (response.ok) {
      const result = await response.json();
      console.log("[VoiceProxy] Fly.io notified:", result);
      return result;
    }

    console.error("[VoiceProxy] Failed to notify Fly.io:", response.status);
    return null;
  } catch (error) {
    console.error("[VoiceProxy] Error notifying Fly.io:", error);
    return null;
  }
}
