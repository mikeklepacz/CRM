import type { Express } from "express";
import { registerAnalyticsTopClientsEndpointRoute } from "./analyticsTopClientsEndpoint.routes";

export function registerAnalyticsTopClientsRoutes(app: Express): void {
  registerAnalyticsTopClientsEndpointRoute(app);
}
