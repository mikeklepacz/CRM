import type { Express } from "express";
import { registerCallManagerQueueAnalyticsRoutes } from "../callManager/callQueueAnalytics.routes";
import { registerCallManagerOperationsRoutes } from "../callManager/callOperations.routes";
import type { CallManagerModuleDeps } from "./callManagerModule.types";

export function registerCallManagerModuleAnalyticsOpsRoutes(app: Express, deps: CallManagerModuleDeps): void {
  registerCallManagerQueueAnalyticsRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    checkAdminAccess: deps.checkAdminAccess,
  });
  registerCallManagerOperationsRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    checkAdminAccess: deps.checkAdminAccess,
  });
}
