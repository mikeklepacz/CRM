import type { Express } from "express";
import { handleSheetsTrackerUpsert } from "./sheetsTrackerUpsert.handler";

type Deps = {
  isAuthenticatedCustom: any;
  clearUserCache: (userId: string) => void;
};

export function registerSheetsTrackerUpsertRoutes(app: Express, deps: Deps): void {
  app.post("/api/sheets/tracker/upsert", deps.isAuthenticatedCustom, async (req: any, res) => {
    await handleSheetsTrackerUpsert(req, res, deps);
  });
}
