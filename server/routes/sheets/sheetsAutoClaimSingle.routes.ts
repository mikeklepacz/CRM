import type { Express } from "express";
import type { SheetsAutoClaimDeps } from "./sheetsAutoClaim.types";
import { handleSheetsAutoClaimSingle } from "./sheetsAutoClaimSingle.handler";

export function registerSheetsAutoClaimSingleRoute(app: Express, deps: SheetsAutoClaimDeps): void {
  app.post("/api/stores/auto-claim", deps.isAuthenticatedCustom, async (req: any, res) => {
    await handleSheetsAutoClaimSingle(req, res);
  });
}
