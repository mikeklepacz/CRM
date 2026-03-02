import type { Express } from "express";
import type { CallQueueAnalyticsDeps as Deps } from "./callQueueAnalytics.types";
import { registerCallQueueGetRoute } from "./callQueueGet.routes";
import { registerCallAnalyticsGetRoute } from "./callAnalyticsGet.routes";

export function registerCallManagerQueueAnalyticsRoutes(
  app: Express,
  deps: Deps
): void {
  registerCallQueueGetRoute(app, deps);
  registerCallAnalyticsGetRoute(app, deps);
}
