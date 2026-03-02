import type { Express } from "express";
import type { StoreLifecycleDeps } from "./storeLifecycle.types";
import { handleStoreDelete } from "./storeDelete.handler";

export function registerStoreDeleteRoute(app: Express, deps: StoreLifecycleDeps): void {
  app.delete("/api/store/:link", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    await handleStoreDelete(req, res);
  });
}
