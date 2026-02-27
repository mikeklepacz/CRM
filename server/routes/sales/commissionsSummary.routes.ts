import type { Express } from "express";
import { storage } from "../../storage";
import * as commissionService from "../../commission-service";
import { ensureSelfOrAdmin, getUserId } from "./commissions.helpers";
import type { SalesCommissionsDeps } from "./commissions.types";

export function registerCommissionsSummaryRoute(app: Express, deps: SalesCommissionsDeps): void {
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
}
