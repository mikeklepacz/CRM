import type { Express } from "express";
import { registerReminderUpdatePutRoute } from "./reminderUpdatePut.routes";
import { registerReminderUpdatePatchRoute } from "./reminderUpdatePatch.routes";
import { registerReminderDeleteRoute } from "./reminderDelete.routes";

export function registerReminderMutationRoutes(app: Express): void {
  registerReminderUpdatePutRoute(app);
  registerReminderUpdatePatchRoute(app);
  registerReminderDeleteRoute(app);
}
