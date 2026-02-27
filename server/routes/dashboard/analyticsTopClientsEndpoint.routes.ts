import type { Express } from "express";
import { buildAnalyticsTopClientsEndpointHandler } from "./analyticsTopClientsEndpoint.handler";

export function registerAnalyticsTopClientsEndpointRoute(app: Express): void {
  app.get('/api/analytics/top-clients', buildAnalyticsTopClientsEndpointHandler());
}
