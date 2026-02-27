import type { Express } from "express";
import { buildAnalyticsDashboardSummaryEndpointHandler } from "./analyticsDashboardSummaryEndpoint.handler";

export function registerAnalyticsDashboardSummaryEndpointRoute(app: Express): void {
  app.get('/api/analytics/dashboard-summary', buildAnalyticsDashboardSummaryEndpointHandler());
}
