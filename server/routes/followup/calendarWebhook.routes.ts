import type { Express } from "express";
import {
  getCalendarWebhookErrorStatusCode,
  getCalendarWebhookStatusForUser,
  reregisterCalendarWebhookForUser,
} from "../../services/followup/calendarWebhook/management";
import { processCalendarWebhook } from "../../services/followup/calendarWebhook/processing";
import { startCalendarWebhookRenewalScheduler } from "../../services/followup/calendarWebhook/renewal";

type Deps = {
  isAuthenticatedCustom: any;
};

export function registerCalendarWebhookRoutes(app: Express, deps: Deps): void {
  app.get("/api/calendar/webhook-status", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const status = await getCalendarWebhookStatusForUser(userId);
      res.json(status);
    } catch (error: any) {
      console.error("Error checking webhook status:", error);
      res.status(500).json({ message: error.message || "Failed to check webhook status" });
    }
  });

  app.post("/api/calendar/webhook-register", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const registration = await reregisterCalendarWebhookForUser(userId);
      res.json(registration);
    } catch (error: any) {
      const statusCode = getCalendarWebhookErrorStatusCode(error);
      if (statusCode) {
        return res.status(statusCode).json({ message: error.message });
      }
      console.error("Error re-registering webhook:", error);
      res.status(500).json({ message: error.message || "Failed to re-register webhook" });
    }
  });

  app.post("/api/webhooks/google-calendar", async (req: any, res) => {
    res.status(200).send("OK");
    try {
      await processCalendarWebhook(req.headers as Record<string, any>);
    } catch {
      // Google already got 200 response. Swallow processing errors here.
    }
  });

  startCalendarWebhookRenewalScheduler();
}
