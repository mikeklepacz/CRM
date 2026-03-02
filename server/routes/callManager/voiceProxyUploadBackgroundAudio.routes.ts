import type { Express } from "express";
import { storage } from "../../storage";
import { audioUpload, notifyFlyProxy } from "./voiceProxyAudio.shared";
import type { VoiceProxyAudioDeps } from "./voiceProxyAudio.types";

export function registerVoiceProxyUploadBackgroundAudioRoute(app: Express, deps: VoiceProxyAudioDeps): void {
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
}
