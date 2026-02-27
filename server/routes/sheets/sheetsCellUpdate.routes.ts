import type { Express } from "express";
import { handleSheetsCellUpdate } from "./sheetsCellUpdate.handler";

type Deps = {
  isAuthenticatedCustom: any;
  clearUserCache: (userId: string) => void;
};

export function registerSheetsCellUpdateRoutes(app: Express, deps: Deps): void {
  app.put("/api/sheets/:id/update", deps.isAuthenticatedCustom, async (req: any, res) => {
    await handleSheetsCellUpdate(req, res, deps);
  });
}
