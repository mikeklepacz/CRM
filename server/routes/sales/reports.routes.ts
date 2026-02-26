import type { Express } from "express";
import { buildReferralCommissionsReport, buildSalesDataReport } from "../../services/sales/reportsService";

type Deps = {
  isAuthenticatedCustom: any;
  isAdmin: any;
  getCurrentUser: any;
};

export function registerSalesReportsRoutes(app: Express, deps: Deps): void {
  app.get("/api/reports/sales-data", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      const payload = await buildSalesDataReport(req.user.tenantId, startDate as string, endDate as string);
      res.json(payload);
    } catch (error: any) {
      console.error("Error fetching sales report data:", error);
      res.status(500).json({ message: error.message || "Failed to fetch sales report data" });
    }
  });

  app.get(
    "/api/reports/referral-commissions",
    deps.isAuthenticatedCustom,
    deps.getCurrentUser,
    async (req: any, res) => {
      try {
        const referralData = await buildReferralCommissionsReport(req.user.tenantId, req.currentUser);
        console.log("[Referral Commissions API] User:", req.currentUser.agentName || req.currentUser.email);
        console.log("[Referral Commissions API] Returning data:", JSON.stringify(referralData, null, 2));
        res.json({ referralCommissions: referralData });
      } catch (error: any) {
        console.error("Error fetching referral commission data:", error);
        res.status(500).json({ message: error.message || "Failed to fetch referral commission data" });
      }
    }
  );
}
