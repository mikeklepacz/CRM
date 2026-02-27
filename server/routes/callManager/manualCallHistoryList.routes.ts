import type { Express } from "express";
import { storage } from "../../storage";
import type { ManualCallHistoryDeps } from "./manualCallHistory.types";

export function registerManualCallHistoryListRoute(app: Express, deps: ManualCallHistoryDeps): void {
  app.get("/api/call-history", deps.isAuthenticatedCustom, async (req, res) => {
    try {
      const userContext = req.user as any;
      const userId = userContext.isPasswordAuth ? userContext.id : userContext.claims.sub;
      const tenantId = userContext.tenantId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { agentId } = req.query;
      if (agentId && (user.roleInTenant === "org_admin" || user.role === "admin")) {
        const callHistory = await storage.getAllCallHistory(tenantId, agentId as string);
        return res.json(callHistory);
      }
      if (user.roleInTenant === "org_admin" || user.role === "admin") {
        const callHistory = await storage.getAllCallHistory(tenantId);
        return res.json(callHistory);
      }

      const callHistory = await storage.getUserCallHistory(userId, tenantId);
      res.json(callHistory);
    } catch (error: any) {
      console.error("Error fetching call history:", error);
      res.status(500).json({ message: error.message || "Failed to fetch call history" });
    }
  });
}
