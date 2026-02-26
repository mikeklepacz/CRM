import type { Express } from "express";
import { storage } from "../../storage";
import * as commissionService from "../../commission-service";

type Deps = {
  isAuthenticatedCustom: any;
};

function getUserId(req: any): string {
  return req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
}

function ensureSelfOrAdmin(user: any, subjectId: string, errorMessage: string): string | null {
  if (user.role !== "admin" && subjectId !== user.id) {
    return errorMessage;
  }
  return null;
}

export function registerSalesCommissionsRoutes(app: Express, deps: Deps): void {
  app.get("/api/commissions", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const agentId = req.query.agentId || userId;
      const denied = ensureSelfOrAdmin(user, agentId, "Cannot view other agents' commissions");
      if (denied) {
        return res.status(403).json({ message: denied });
      }

      const commissions = await commissionService.getAgentCommissions(agentId, {
        commissionKind: req.query.kind,
        startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
      });
      res.json(commissions);
    } catch (error: any) {
      console.error("Error fetching commissions:", error);
      res.status(500).json({ message: error.message || "Failed to fetch commissions" });
    }
  });

  app.get("/api/commissions/summary", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const agentId = req.query.agentId || userId;
      const denied = ensureSelfOrAdmin(user, agentId, "Cannot view other agents' commission summary");
      if (denied) {
        return res.status(403).json({ message: denied });
      }

      const summary = await commissionService.getCommissionSummary(agentId);
      res.json(summary);
    } catch (error: any) {
      console.error("Error fetching commission summary:", error);
      res.status(500).json({ message: error.message || "Failed to fetch commission summary" });
    }
  });

  app.get("/api/commissions/team", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const referrerId = req.query.referrerId || userId;
      const denied = ensureSelfOrAdmin(user, referrerId, "Cannot view other agents' team data");
      if (denied) {
        return res.status(403).json({ message: denied });
      }

      const teamData = await commissionService.getTeamCommissions(referrerId);
      res.json(teamData);
    } catch (error: any) {
      console.error("Error fetching team commissions:", error);
      res.status(500).json({ message: error.message || "Failed to fetch team commissions" });
    }
  });
}
