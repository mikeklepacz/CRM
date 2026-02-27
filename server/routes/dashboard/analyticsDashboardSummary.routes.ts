import type { Express } from "express";
import { registerAnalyticsDashboardSummaryEndpointRoute } from "./analyticsDashboardSummaryEndpoint.routes";

export function registerAnalyticsDashboardSummaryRoutes(app: Express): void {
  registerAnalyticsDashboardSummaryEndpointRoute(app);
}
