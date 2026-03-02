import type { Express } from "express";
import type { OrderMatchSuggestionsRouteDeps } from "./orderMatchSuggestions.types";
import { buildOrderMatchSuggestionsEndpointHandler } from "./orderMatchSuggestionsEndpoint.handler";

export function registerOrderMatchSuggestionsEndpointRoute(app: Express, deps: OrderMatchSuggestionsRouteDeps): void {
  // Get smart match suggestions for an order (searches Google Sheets Store Database)
  // Supports manual search via ?search=term query parameter
  app.get('/api/orders/:orderId/match-suggestions', deps.isAuthenticatedCustom, deps.isAdmin, buildOrderMatchSuggestionsEndpointHandler());
}
