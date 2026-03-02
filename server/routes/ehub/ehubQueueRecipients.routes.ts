import type { Express } from "express";
import { registerEhubPausedRecipientsRoute } from "./ehubPausedRecipients.routes";
import { registerEhubQueueGenerateRoute } from "./ehubQueueGenerate.routes";
import { registerEhubQueueListRoute } from "./ehubQueueList.routes";
import { registerEhubQueuePausedCountRoute } from "./ehubQueuePausedCount.routes";
import { registerEhubQueueRebuildRoute } from "./ehubQueueRebuild.routes";
import { registerEhubQueueSettingsRoute } from "./ehubQueueSettings.routes";
import { registerEhubRecipientBulkDeleteRoute } from "./ehubRecipientBulkDelete.routes";
import { registerEhubRecipientDelayRoute } from "./ehubRecipientDelay.routes";
import { registerEhubRecipientDeleteRoute } from "./ehubRecipientDelete.routes";
import { registerEhubRecipientPauseRoute } from "./ehubRecipientPause.routes";
import { registerEhubRecipientResumeRoute } from "./ehubRecipientResume.routes";
import { registerEhubRecipientSendNowRoute } from "./ehubRecipientSendNow.routes";
import { registerEhubRecipientSkipStepRoute } from "./ehubRecipientSkipStep.routes";
import type { EhubQueueRecipientsRouteDeps } from "./ehubQueueRecipients.types";

export function registerEhubQueueRecipientsRoutes(
  app: Express,
  deps: EhubQueueRecipientsRouteDeps
): void {
  registerEhubQueueSettingsRoute(app, deps);
  registerEhubQueueListRoute(app, deps);
  registerEhubQueueGenerateRoute(app, deps);
  registerEhubQueueRebuildRoute(app, deps);
  registerEhubPausedRecipientsRoute(app, deps);
  registerEhubQueuePausedCountRoute(app, deps);
  registerEhubRecipientPauseRoute(app, deps);
  registerEhubRecipientResumeRoute(app, deps);
  registerEhubRecipientSkipStepRoute(app, deps);
  registerEhubRecipientSendNowRoute(app, deps);
  registerEhubRecipientDelayRoute(app, deps);
  registerEhubRecipientDeleteRoute(app, deps);
  registerEhubRecipientBulkDeleteRoute(app, deps);
}
