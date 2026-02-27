import type { Express } from "express";
import type { StoreAssignmentAdminDeps } from "./storeAssignmentAdmin.types";
import { handleStoreBulkAssign } from "./storeBulkAssign.handler";

export function registerStoreBulkAssignRoute(app: Express, deps: StoreAssignmentAdminDeps): void {
  app.post("/api/stores/bulk-assign", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    await handleStoreBulkAssign(req, res, deps);
  });
}
