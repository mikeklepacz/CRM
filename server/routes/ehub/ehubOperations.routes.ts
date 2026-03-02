import type { Express } from "express";
import { registerEhubOperationsAllContactsRoute } from "./ehubOperationsAllContacts.routes";
import { registerEhubOperationsEmailFailuresRoute } from "./ehubOperationsEmailFailures.routes";
import { registerEhubOperationsScanRepliesRoute } from "./ehubOperationsScanReplies.routes";
import { registerEhubOperationsSentHistoryRoute } from "./ehubOperationsSentHistory.routes";
import { registerEhubOperationsSettingsRoute } from "./ehubOperationsSettings.routes";
import type { EhubOperationsRouteDeps } from "./ehubOperations.types";

export function registerEhubOperationsRoutes(
  app: Express,
  deps: EhubOperationsRouteDeps
): void {
  registerEhubOperationsSettingsRoute(app, deps);
  registerEhubOperationsAllContactsRoute(app, deps);
  registerEhubOperationsSentHistoryRoute(app, deps);
  registerEhubOperationsEmailFailuresRoute(app, deps);
  registerEhubOperationsScanRepliesRoute(app, deps);
}
