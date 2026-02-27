import type { Express } from "express";
import type { CallInsightsAdminDeps as Deps } from "./callInsightsAdmin.types";
import { registerAnalysisJobStatusRoute } from "./analysisJobStatus.routes";
import { registerInsightsHistoryRoute } from "./insightsHistory.routes";
import { registerNukeAnalysisRoute } from "./nukeAnalysis.routes";
import { registerNukeCallDataRoute } from "./nukeCallData.routes";

export function registerCallManagerInsightsAdminRoutes(
  app: Express,
  deps: Deps
): void {
  registerAnalysisJobStatusRoute(app, deps);
  registerInsightsHistoryRoute(app, deps);
  registerNukeAnalysisRoute(app, deps);
  registerNukeCallDataRoute(app, deps);
}
