import type { Express } from "express";
import type { ManualCallHistoryDeps as Deps } from "./manualCallHistory.types";
import { registerManualCallHistoryCreateRoute } from "./manualCallHistoryCreate.routes";
import { registerManualCallHistoryListRoute } from "./manualCallHistoryList.routes";

export function registerCallManagerManualCallHistoryRoutes(app: Express, deps: Deps): void {
  registerManualCallHistoryCreateRoute(app, deps);
  registerManualCallHistoryListRoute(app, deps);
}
