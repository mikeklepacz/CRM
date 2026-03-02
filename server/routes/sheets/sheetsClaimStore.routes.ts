import type { Express } from "express";
import { handleSheetsClaimStore } from "./sheetsClaimStore.handler";

type Deps = {
  isAuthenticatedCustom: any;
  clearUserCache: (userId: string) => void;
};

export function registerSheetsClaimStoreRoutes(app: Express, deps: Deps): void {
  app.post("/api/sheets/:id/claim-store", deps.isAuthenticatedCustom, async (req: any, res) => {
    await handleSheetsClaimStore(req, res, deps);
  });
}
