import type { Express } from "express";
import { registerStoreDiscoveryAllRoute } from "./storeDiscoveryAll.routes";
import { registerStoreDiscoveryByDbaRoute } from "./storeDiscoveryByDba.routes";
import { registerStoreDiscoveryClaimMultipleRoute } from "./storeDiscoveryClaimMultiple.routes";
import type { StoreDiscoveryRouteDeps } from "./storeDiscovery.types";

export function registerStoreDiscoveryRoutes(app: Express, deps: StoreDiscoveryRouteDeps): void {
  registerStoreDiscoveryAllRoute(app, deps);
  registerStoreDiscoveryByDbaRoute(app, deps);
  registerStoreDiscoveryClaimMultipleRoute(app, deps);
}
