import type { Express } from "express";
import { registerTestDataNukeCountsRoute } from "./testDataNukeCounts.routes";
import { registerTestDataNukeRoute } from "./testDataNuke.routes";
import { registerTestEmailCheckReplyRoute } from "./testEmailCheckReply.routes";
import { registerTestEmailHistoryRoute } from "./testEmailHistory.routes";
import { registerTestEmailSendFollowupRoute } from "./testEmailSendFollowup.routes";
import { registerTestEmailSendRoute } from "./testEmailSend.routes";
import type { TestEmailRouteDeps } from "./testEmail.types";

export function registerTestEmailRoutes(
  app: Express,
  deps: TestEmailRouteDeps
): void {
  registerTestEmailSendRoute(app, deps);
  registerTestEmailCheckReplyRoute(app, deps);
  registerTestEmailSendFollowupRoute(app, deps);
  registerTestEmailHistoryRoute(app, deps);
  registerTestDataNukeCountsRoute(app, deps);
  registerTestDataNukeRoute(app, deps);
}
