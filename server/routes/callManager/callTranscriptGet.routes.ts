import type { Express } from "express";
import { storage } from "../../storage";
import type { CallOperationsDeps } from "./callOperations.types";

export function registerCallTranscriptGetRoute(app: Express, deps: CallOperationsDeps): void {
  app.get("/api/elevenlabs/call-transcript/:conversationId", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);

      const isAdminUser = await deps.checkAdminAccess(user, req.user.tenantId);
      if (!isAdminUser && !user?.hasVoiceAccess) {
        return res.status(403).json({ error: "Voice calling access required" });
      }

      const { conversationId } = req.params;
      const transcripts = await storage.getCallTranscripts(conversationId);
      res.json({ transcripts });
    } catch (error: any) {
      console.error("Error fetching call transcript:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
}
