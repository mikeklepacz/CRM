import type { Express } from "express";
import { storage } from "../../storage";
import type { CallSessionsDeps } from "./callSessions.types";

export function registerCallSessionsGetByConversationRoute(app: Express, deps: CallSessionsDeps): void {
  app.get("/api/call-sessions/:conversationId", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);

      const session = await storage.getCallSessionByConversationId(conversationId, req.user.tenantId);
      if (!session) {
        return res.status(404).json({ error: "Call session not found" });
      }

      const isAdminUser = await deps.checkAdminAccess(user, req.user.tenantId);
      if (!isAdminUser && session.initiatedByUserId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const transcripts = await storage.getCallTranscripts(conversationId);

      res.json({
        session,
        transcripts,
      });
    } catch (error: any) {
      console.error("Error fetching call session:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
}
