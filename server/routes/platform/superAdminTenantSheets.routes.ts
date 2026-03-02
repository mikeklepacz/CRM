import type { Express } from "express";
import type { SuperAdminTenantSheetsDeps } from "./superAdminTenantSheets.types";
import { registerSuperAdminTenantSheetsListConnectedRoute } from "./superAdminTenantSheetsListConnected.routes";
import { registerSuperAdminTenantSheetsListAvailableRoute } from "./superAdminTenantSheetsListAvailable.routes";
import { registerSuperAdminTenantSheetsInfoRoute } from "./superAdminTenantSheetsInfo.routes";
import { registerSuperAdminTenantSheetsConnectRoute } from "./superAdminTenantSheetsConnect.routes";
import { registerSuperAdminTenantSheetsDisconnectRoute } from "./superAdminTenantSheetsDisconnect.routes";
import { registerSuperAdminTenantSheetsSyncImportRoute } from "./superAdminTenantSheetsSyncImport.routes";
import { registerSuperAdminTenantSheetsSyncExportRoute } from "./superAdminTenantSheetsSyncExport.routes";
import { registerSuperAdminTenantSheetsSyncBidirectionalRoute } from "./superAdminTenantSheetsSyncBidirectional.routes";

export function registerSuperAdminTenantSheetsRoutes(
  app: Express,
  deps: SuperAdminTenantSheetsDeps
): void {
  registerSuperAdminTenantSheetsListConnectedRoute(app, deps);
  registerSuperAdminTenantSheetsListAvailableRoute(app, deps);
  registerSuperAdminTenantSheetsInfoRoute(app, deps);
  registerSuperAdminTenantSheetsConnectRoute(app, deps);
  registerSuperAdminTenantSheetsDisconnectRoute(app, deps);
  registerSuperAdminTenantSheetsSyncImportRoute(app, deps);
  registerSuperAdminTenantSheetsSyncExportRoute(app, deps);
  registerSuperAdminTenantSheetsSyncBidirectionalRoute(app, deps);
}
