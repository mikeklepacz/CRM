import type { Express } from "express";
import { registerNotificationsListRoute } from "./notificationsList.routes";
import { registerNotificationsReadRoute } from "./notificationsRead.routes";
import { registerNotificationsResolveRoute } from "./notificationsResolve.routes";
import { registerNotificationsDeleteRoute } from "./notificationsDelete.routes";

export function registerNotificationsRoutes(app: Express): void {
  registerNotificationsListRoute(app);
  registerNotificationsReadRoute(app);
  registerNotificationsResolveRoute(app);
  registerNotificationsDeleteRoute(app);
}
