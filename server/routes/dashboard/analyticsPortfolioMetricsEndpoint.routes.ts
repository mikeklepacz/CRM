import type { Express } from "express";
import { buildAnalyticsPortfolioMetricsEndpointHandler } from "./analyticsPortfolioMetricsEndpoint.handler";

export function registerAnalyticsPortfolioMetricsEndpointRoute(app: Express): void {
  app.get('/api/analytics/portfolio-metrics', buildAnalyticsPortfolioMetricsEndpointHandler());
}
