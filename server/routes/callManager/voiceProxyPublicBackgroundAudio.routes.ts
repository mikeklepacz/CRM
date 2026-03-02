import type { Express } from "express";
import { storage } from "../../storage";
import { FLY_PROXY_SECRET } from "./voiceProxyAudio.shared";

export function registerVoiceProxyPublicBackgroundAudioRoute(app: Express): void {
  app.get("/api/voice-proxy/background-audio/public", async (req: any, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || authHeader !== `Bearer ${FLY_PROXY_SECRET}`) {
        return res.status(401).json({ error: "Unauthorized" });
      }

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
      console.error("Error streaming public background audio:", error);
      res.status(500).json({ error: error.message || "Failed to load audio file" });
    }
  });
}
