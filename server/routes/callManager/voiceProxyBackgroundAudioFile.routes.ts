import type { Express } from "express";
import { storage } from "../../storage";
import type { VoiceProxyAudioDeps } from "./voiceProxyAudio.types";

export function registerVoiceProxyBackgroundAudioFileRoute(app: Express, deps: VoiceProxyAudioDeps): void {
  app.get("/api/voice-proxy/background-audio/file", deps.isAuthenticatedCustom, deps.isAdmin, async (_req: any, res) => {
    try {
      const settings = await storage.getBackgroundAudioSettings();
      if (!settings?.filePath) {
        return res.status(404).json({ error: "No background audio file uploaded" });
      }

      const { audioConverter } = await import("../../audio-converter.js");
      const audioBuffer = await audioConverter.loadAudioFile(settings.filePath);

      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Content-Disposition", `inline; filename="${settings.fileName || "background-audio.wav"}"`);
      res.send(audioBuffer);
    } catch (error: any) {
      console.error("Error streaming background audio:", error);
      res.status(500).json({ error: error.message || "Failed to load audio file" });
    }
  });
}
