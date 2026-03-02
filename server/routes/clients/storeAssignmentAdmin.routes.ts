import type { Express } from "express";
import type { StoreAssignmentAdminDeps as Deps } from "./storeAssignmentAdmin.types";
import { registerStoreSearchRoute } from "./storeSearch.routes";
import { registerStoreBulkAssignRoute } from "./storeBulkAssign.routes";

export function registerStoreAssignmentAdminRoutes(app: Express, deps: Deps): void {
  registerStoreSearchRoute(app, deps);
  registerStoreBulkAssignRoute(app, deps);
}
