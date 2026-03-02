import type { Express } from "express";
import type { CallQueueAnalyticsDeps } from "./callQueueAnalytics.types";
import { handleCallAnalyticsGet } from "./callAnalyticsGet.handler";

export function registerCallAnalyticsGetRoute(app: Express, deps: CallQueueAnalyticsDeps): void {
  app.get("/api/elevenlabs/call-analytics", deps.isAuthenticatedCustom, async (req: any, res) => {
    await handleCallAnalyticsGet(req, res, deps);
  });
}
