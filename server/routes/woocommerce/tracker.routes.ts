import type { Express } from "express";
import type { WooCommerceTrackerDeps as Deps } from "./tracker.types";
import { handleWooCommerceWriteToTracker } from "./trackerWrite.handler";

export function registerWooCommerceTrackerRoutes(
  app: Express,
  deps: Deps,
): void {
  app.post("/api/woocommerce/write-to-tracker", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    await handleWooCommerceWriteToTracker(req, res);
  });
}
