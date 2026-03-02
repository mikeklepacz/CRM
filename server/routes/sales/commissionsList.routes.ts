import type { Express } from "express";
import { storage } from "../../storage";
import * as commissionService from "../../commission-service";
import { ensureSelfOrAdmin, getUserId } from "./commissions.helpers";
import type { SalesCommissionsDeps } from "./commissions.types";

export function registerCommissionsListRoute(app: Express, deps: SalesCommissionsDeps): void {
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
}
