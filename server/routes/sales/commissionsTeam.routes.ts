import type { Express } from "express";
import { storage } from "../../storage";
import * as commissionService from "../../commission-service";
import { ensureSelfOrAdmin, getUserId } from "./commissions.helpers";
import type { SalesCommissionsDeps } from "./commissions.types";

export function registerCommissionsTeamRoute(app: Express, deps: SalesCommissionsDeps): void {
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
