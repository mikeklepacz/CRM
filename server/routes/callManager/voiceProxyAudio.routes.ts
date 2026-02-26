import type { Express } from "express";
import multer from "multer";
import { storage } from "../../storage";

const FLY_PROXY_SECRET = process.env.FLY_PROXY_SECRET || "hemp-voice-proxy-secret-2024";
const FLY_VOICE_PROXY_CONFIG_URL = process.env.FLY_VOICE_PROXY_CONFIG_URL || "https://hemp-voice-proxy.fly.dev/config";

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

async function notifyFlyProxy(config: { action?: string; volumeDb?: number; audioUrl?: string }) {
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

export function registerCallManagerVoiceProxyAudioRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any }
): void {
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

  app.post(
    "/api/voice-proxy/background-audio/upload",
    deps.isAuthenticatedCustom,
    deps.isAdmin,
    audioUpload.single("file"),
    async (req: any, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No audio file provided" });
        }

        const { audioConverter } = await import("../../audio-converter.js");
        const result = await audioConverter.convertAndSave(req.file.buffer, req.file.originalname);

        const settings = await storage.updateBackgroundAudioSettings({
          tenantId: req.user.tenantId,
          fileName: result.fileName,
          filePath: result.filePath,
          volumeDb: -25,
          uploadedAt: new Date(),
        } as any);

        notifyFlyProxy({ action: "reload-audio", volumeDb: -25 }).catch(() => {});
        res.json(settings);
      } catch (error: any) {
        console.error("Error uploading background audio:", error);
        res.status(500).json({ error: error.message || "Failed to upload audio file" });
      }
    }
  );

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

  app.get("/api/voice-proxy/sessions/active", deps.isAuthenticatedCustom, deps.isAdmin, async (_req: any, res) => {
    try {
      const sessions = await storage.getActiveVoiceProxySessions();
      res.json(sessions);
    } catch (error: any) {
      console.error("Error fetching active voice proxy sessions:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
}
