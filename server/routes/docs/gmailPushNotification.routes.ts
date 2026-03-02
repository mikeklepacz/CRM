import type { Express } from "express";
import { eventGateway } from "../../services/events/gateway";
import { processGmailPushNotification } from "../../services/docs/gmailPushService";
import type { GmailPushDeps } from "./gmailPush.types";

export function registerGmailPushNotificationRoute(app: Express, _deps: GmailPushDeps): void {
  app.post("/api/gmail/push", async (req, res) => {
    res.status(200).send("OK");

    try {
      await processGmailPushNotification({
        body: req.body,
        emit: (payload) => eventGateway.emit("gmail:newMessage", payload),
      });
    } catch (error: any) {
      console.error("[GmailPush] Error handling push notification:", error);
    }
  });
}
