import type { Express } from "express";
import { storage } from "../../storage";
import { FLY_PROXY_SECRET } from "./voiceProxyAudio.shared";

export function registerVoiceProxyPublicSettingsRoute(app: Express): void {
  app.get("/api/voice-proxy/background-audio/settings-public", async (req: any, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || authHeader !== `Bearer ${FLY_PROXY_SECRET}`) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const settings = await storage.getBackgroundAudioSettings();

      let audioHash = null;
      if (settings?.fileName && settings?.updatedAt) {
        const hashInput = `${settings.fileName}-${settings.updatedAt.getTime()}`;
        audioHash = Buffer.from(hashInput).toString("base64").slice(0, 16);
      }

      res.json({
        volumeDb: settings?.volumeDb ?? -25,
        hasAudioFile: !!settings?.filePath,
        fileName: settings?.fileName || null,
        audioHash,
      });
    } catch (error: any) {
      console.error("Error fetching public settings:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
}
