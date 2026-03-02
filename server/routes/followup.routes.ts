import type { Express } from "express";
import { registerFollowUpCenterRoutes } from "./followup/followupCenter.routes";
import { registerManualDraftEnrollmentRoutes } from "./followup/manualDraftEnrollment.routes";
import { registerReminderReadRoutes } from "./followup/reminderRead.routes";
import { registerReminderCreateRoutes } from "./followup/reminderCreate.routes";
import { registerReminderMutationRoutes } from "./followup/reminderMutations.routes";
import { registerReminderCalendarRoutes } from "./followup/reminderCalendar.routes";
import { registerCalendarWebhookRoutes } from "./followup/calendarWebhook.routes";

export function registerFollowUpRoutes(
  app: Express,
  deps: { isAuthenticatedCustom: any }
): void {
  registerReminderReadRoutes(app);
  registerReminderCreateRoutes(app);
  registerReminderMutationRoutes(app);
  registerReminderCalendarRoutes(app);
  registerCalendarWebhookRoutes(app, deps);
  registerFollowUpCenterRoutes(app, deps);
  registerManualDraftEnrollmentRoutes(app, deps);
}
