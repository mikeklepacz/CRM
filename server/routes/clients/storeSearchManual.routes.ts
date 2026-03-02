import type { Express } from "express";
import type { StoreManualMatchingDeps } from "./storeManualMatching.types";
import { handleStoreSearchManual } from "./storeSearchManual.handler";

export function registerStoreSearchManualRoute(app: Express, deps: StoreManualMatchingDeps): void {
  app.post("/api/stores/search", deps.isAuthenticatedCustom, async (req: any, res) => {
    await handleStoreSearchManual(req, res);
  });
}
