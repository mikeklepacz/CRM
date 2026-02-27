import type { Express } from "express";
import type { SheetsCatalogDeps as Deps } from "./sheetsCatalog.types";
import { registerSheetsListSpreadsheetsRoute } from "./sheetsListSpreadsheets.routes";
import { registerSheetsSpreadsheetInfoRoute } from "./sheetsSpreadsheetInfo.routes";
import { registerSheetsActiveRoute } from "./sheetsActive.routes";
import { registerSheetsConnectRoute } from "./sheetsConnect.routes";
import { registerSheetsListConnectedRoute } from "./sheetsListConnected.routes";
import { registerSheetsDataByIdRoute } from "./sheetsDataById.routes";
import { registerSheetsRefreshRoute } from "./sheetsRefresh.routes";
import { registerSheetsDisconnectRoute } from "./sheetsDisconnect.routes";

export function registerSheetsCatalogRoutes(app: Express, deps: Deps): void {
  registerSheetsListSpreadsheetsRoute(app, deps);
  registerSheetsSpreadsheetInfoRoute(app, deps);
  registerSheetsActiveRoute(app, deps);
  registerSheetsConnectRoute(app, deps);
  registerSheetsListConnectedRoute(app, deps);
  registerSheetsDataByIdRoute(app, deps);
  registerSheetsRefreshRoute(app, deps);
  registerSheetsDisconnectRoute(app, deps);
}
