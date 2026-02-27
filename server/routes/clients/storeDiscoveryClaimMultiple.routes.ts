import type { Express } from "express";
import type { StoreDiscoveryRouteDeps } from "./storeDiscovery.types";
import { handleStoreDiscoveryClaimMultiple } from "./storeDiscoveryClaimMultiple.handler";

export function registerStoreDiscoveryClaimMultipleRoute(app: Express, deps: StoreDiscoveryRouteDeps): void {
  app.post("/api/stores/claim-multiple", deps.isAuthenticatedCustom, async (req: any, res) => {
    await handleStoreDiscoveryClaimMultiple(req, res, deps);
  });
}
