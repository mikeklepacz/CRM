import type { Express } from "express";
import type { WooCommerceSyncDeps as Deps } from "./sync.types";
import { handleWooCommerceSync } from "./sync.handler";

export function registerWooCommerceSyncRoutes(
  app: Express,
  deps: Deps,
): void {
  app.post("/api/woocommerce/sync", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    await handleWooCommerceSync(req, res);
  });
}
