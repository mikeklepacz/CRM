import type { Express } from "express";
import { storage } from "../../storage";

export function registerCallManagerSessionsRoutes(
  app: Express,
  deps: {
    isAuthenticatedCustom: any;
    checkAdminAccess: (user: any, tenantId: string | undefined) => Promise<boolean>;
  }
): void {
  app.get("/api/call-sessions", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { clientId, status, qualificationLeadId } = req.query;

      const isAdminUser = await deps.checkAdminAccess(user, req.user.tenantId);
      if (!isAdminUser && !user?.hasVoiceAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      const tenantId = req.user.tenantId;
      const filters: any = {};
      if (!isAdminUser) {
        filters.initiatedByUserId = userId;
      }
      if (clientId) {
        filters.clientId = clientId;
      }
      if (status) {
        filters.status = status;
      }
      if (qualificationLeadId) {
        filters.qualificationLeadId = qualificationLeadId;
      }

      const sessions = await storage.getCallSessions(tenantId, filters);
      res.json(sessions);
    } catch (error: any) {
      console.error("Error fetching call sessions:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

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
