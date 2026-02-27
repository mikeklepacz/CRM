import type { Express } from "express";
import { handleSheetsTrackerUnclaim, handleStoreCommissionsCount } from "./sheetsTrackerUnclaim.handler";

type Deps = {
  isAuthenticatedCustom: any;
};

export function registerSheetsTrackerUnclaimRoutes(app: Express, deps: Deps): void {
  app.get("/api/stores/:encodedLink/commissions/count", deps.isAuthenticatedCustom, async (req: any, res) => {
    await handleStoreCommissionsCount(req, res);
  });

  app.delete("/api/sheets/tracker/row", deps.isAuthenticatedCustom, async (req: any, res) => {
    await handleSheetsTrackerUnclaim(req, res);
  });
}
