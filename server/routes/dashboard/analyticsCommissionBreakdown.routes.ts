import type { Express } from "express";
import { handleAnalyticsCommissionBreakdown } from "./analyticsCommissionBreakdown.handler";

export function registerAnalyticsCommissionBreakdownRoutes(app: Express): void {
  app.get("/api/analytics/commission-breakdown", async (req: any, res) => {
    await handleAnalyticsCommissionBreakdown(req, res);
  });
}
