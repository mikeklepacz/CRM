import type { Express } from "express";
import { storage } from "../../storage";
import { notifyFlyProxy } from "./voiceProxyAudio.shared";
import type { VoiceProxyAudioDeps } from "./voiceProxyAudio.types";

export function registerVoiceProxyUpdateVolumeRoute(app: Express, deps: VoiceProxyAudioDeps): void {
  app.put("/api/voice-proxy/background-audio/volume", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { volumeDb } = req.body;

      if (typeof volumeDb !== "number" || volumeDb < -40 || volumeDb > -10) {
        return res.status(400).json({ error: "Volume must be between -40dB and -10dB" });
      }

      const existing = await storage.getBackgroundAudioSettings();
      const settings = await storage.updateBackgroundAudioSettings({
        ...existing,
        volumeDb,
        updatedAt: new Date(),
      } as any);

      notifyFlyProxy({ volumeDb }).catch(() => {});
      res.json(settings);
    } catch (error: any) {
      console.error("Error updating background audio volume:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
}
