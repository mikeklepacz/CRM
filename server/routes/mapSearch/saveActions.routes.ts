import type { Express } from "express";
import type { MapSearchSaveActionsDeps as Deps } from "./saveActions.types";
import { registerMapSaveToSheetRoute } from "./mapSaveToSheet.routes";
import { registerMapSaveToQualificationRoute } from "./mapSaveToQualification.routes";

export function registerMapSearchSaveActionsRoutes(app: Express, deps: Deps): void {
  registerMapSaveToSheetRoute(app, deps);
  registerMapSaveToQualificationRoute(app, deps);
}
