import type { Express } from "express";
import type { OrderMatchRouteDeps } from "./orderMatch.types";
import { buildOrderMatchEndpointHandler } from "./orderMatchEndpoint.handler";

export function registerOrderMatchEndpointRoute(app: Express, deps: OrderMatchRouteDeps): void {
  // Manually match an order to multiple stores (Google Sheets-based multi-select)
  app.post('/api/orders/:orderId/match', deps.isAuthenticatedCustom, deps.isAdmin, buildOrderMatchEndpointHandler(deps));
}
