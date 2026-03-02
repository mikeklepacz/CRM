import type { Express } from "express";
import type { StoreAssignmentAdminDeps } from "./storeAssignmentAdmin.types";
import { handleStoreSearch } from "./storeSearch.handler";

export function registerStoreSearchRoute(app: Express, deps: StoreAssignmentAdminDeps): void {
  app.post("/api/stores/search", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    await handleStoreSearch(req, res);
  });
}
