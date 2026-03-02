import type { Express } from "express";
import { registerOrderMatchSuggestionsEndpointRoute } from "./orderMatchSuggestionsEndpoint.routes";
import type { OrderMatchSuggestionsRouteDeps } from "./orderMatchSuggestions.types";

export function registerOrderMatchSuggestionsRoutes(
  app: Express,
  deps: OrderMatchSuggestionsRouteDeps,
): void {
  registerOrderMatchSuggestionsEndpointRoute(app, deps);
}
