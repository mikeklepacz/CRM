import type { Express } from "express";
import type { SheetsAutoClaimDeps as Deps } from "./sheetsAutoClaim.types";
import { registerSheetsAutoClaimSingleRoute } from "./sheetsAutoClaimSingle.routes";
import { registerSheetsClaimVcardExportRoute } from "./sheetsClaimVcardExport.routes";

export function registerSheetsAutoClaimRoutes(app: Express, deps: Deps): void {
  registerSheetsAutoClaimSingleRoute(app, deps);
  registerSheetsClaimVcardExportRoute(app, deps);
}
