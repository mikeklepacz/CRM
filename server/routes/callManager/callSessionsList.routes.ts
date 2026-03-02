import type { Express } from "express";
import { storage } from "../../storage";
import type { CallSessionsDeps } from "./callSessions.types";

export function registerCallSessionsListRoute(app: Express, deps: CallSessionsDeps): void {
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
}
