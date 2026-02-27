import type { Express } from "express";
import type { SheetsSyncDeps as Deps } from "./sheetsSync.types";
import { registerSheetsSyncImportRoute } from "./sheetsSyncImport.routes";
import { registerSheetsSyncExportRoute } from "./sheetsSyncExport.routes";
import { registerSheetsSyncBidirectionalRoute } from "./sheetsSyncBidirectional.routes";

export function registerSheetsSyncRoutes(app: Express, deps: Deps): void {
  registerSheetsSyncImportRoute(app, deps);
  registerSheetsSyncExportRoute(app, deps);
  registerSheetsSyncBidirectionalRoute(app, deps);
}
