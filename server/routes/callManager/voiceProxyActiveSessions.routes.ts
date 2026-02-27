import type { Express } from "express";
import { storage } from "../../storage";
import type { VoiceProxyAudioDeps } from "./voiceProxyAudio.types";

export function registerVoiceProxyActiveSessionsRoute(app: Express, deps: VoiceProxyAudioDeps): void {
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
