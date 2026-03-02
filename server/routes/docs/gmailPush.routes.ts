import type { Express } from "express";
import type { GmailPushDeps as Deps } from "./gmailPush.types";
import { registerGmailPushNotificationRoute } from "./gmailPushNotification.routes";
import { registerGmailPushStatusRoute } from "./gmailPushStatus.routes";
import { registerGmailPushWatchStartRoute } from "./gmailPushWatchStart.routes";
import { registerGmailPushWatchStopRoute } from "./gmailPushWatchStop.routes";

export function registerGmailPushRoutes(app: Express, deps: Deps): void {
  registerGmailPushNotificationRoute(app, deps);
  registerGmailPushStatusRoute(app, deps);
  registerGmailPushWatchStartRoute(app, deps);
  registerGmailPushWatchStopRoute(app, deps);
}
