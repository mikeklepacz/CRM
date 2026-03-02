import type { Express } from "express";
import { registerOrderMatchEndpointRoute } from "./orderMatchEndpoint.routes";
import type { OrderMatchRouteDeps } from "./orderMatch.types";

export function registerOrderMatchRoutes(
  app: Express,
  deps: OrderMatchRouteDeps,
): void {
  registerOrderMatchEndpointRoute(app, deps);
}
