import type { Express } from "express";
import { registerAnalyticsPortfolioMetricsEndpointRoute } from "./analyticsPortfolioMetricsEndpoint.routes";

export function registerAnalyticsPortfolioMetricsRoutes(app: Express): void {
  registerAnalyticsPortfolioMetricsEndpointRoute(app);
}
