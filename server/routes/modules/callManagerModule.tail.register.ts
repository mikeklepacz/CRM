import type { Express } from "express";
import { registerCallManagerInsightsAdminRoutes } from "../callManager/callInsightsAdmin.routes";
import { registerCallManagerManualCallHistoryRoutes } from "../callManager/manualCallHistory.routes";
import type { CallManagerModuleDeps } from "./callManagerModule.types";

export function registerCallManagerModuleTailRoutes(app: Express, deps: CallManagerModuleDeps): void {
  registerCallManagerInsightsAdminRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
  });
  registerCallManagerManualCallHistoryRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
}
