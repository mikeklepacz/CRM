import type { Express } from "express";
import type { StoreManualMatchingDeps as Deps } from "./storeManualMatching.types";
import { registerStoreSearchManualRoute } from "./storeSearchManual.routes";
import { registerStoreImportNewRoute } from "./storeImportNew.routes";

export function registerStoreManualMatchingRoutes(app: Express, deps: Deps): void {
  registerStoreSearchManualRoute(app, deps);
  registerStoreImportNewRoute(app, deps);
}
