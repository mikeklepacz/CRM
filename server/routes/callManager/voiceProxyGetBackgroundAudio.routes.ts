import type { Express } from "express";
import { storage } from "../../storage";
import type { VoiceProxyAudioDeps } from "./voiceProxyAudio.types";

export function registerVoiceProxyGetBackgroundAudioRoute(app: Express, deps: VoiceProxyAudioDeps): void {
  app.get("/api/voice-proxy/background-audio", deps.isAuthenticatedCustom, deps.isAdmin, async (_req: any, res) => {
    try {
      const settings = await storage.getBackgroundAudioSettings();
      res.json(
        settings || {
          volumeDb: -25,
          fileName: null,
          filePath: null,
        }
      );
    } catch (error: any) {
      console.error("Error fetching background audio settings:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
}
