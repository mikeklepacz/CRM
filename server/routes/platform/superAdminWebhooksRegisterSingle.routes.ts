import type { Express } from "express";
import type { SuperAdminTicketsWebhooksRouteDeps } from "./superAdminTicketsWebhooks.types";
import { requireSuperAdminFromSession } from "./superAdminTicketsWebhooks.helpers";
import { setupCalendarWatch } from "../../calendarSync";
import { storage } from "../../storage";

export function registerSuperAdminWebhooksRegisterSingleRoute(app: Express, deps: SuperAdminTicketsWebhooksRouteDeps): void {
  app.post("/api/super-admin/webhooks/:userId/register", deps.isAuthenticatedCustom, async (req: any, res) => {
      try {
          const superAdmin = await requireSuperAdminFromSession(req, res);
          if (!superAdmin)
              return;
          const { userId: targetUserId } = req.params;
          const targetUser = await storage.getUser(targetUserId);
          if (!targetUser) {
              return res.status(404).json({ message: "User not found" });
          }
          const integration = await storage.getUserIntegration(targetUserId);
          if (!integration?.googleCalendarAccessToken) {
              return res.status(400).json({ message: "User does not have Google Calendar connected" });
          }
          const success = await setupCalendarWatch(targetUserId);
          if (!success) {
              return res.status(500).json({ success: false, message: "Webhook registration failed" });
          }
          const updatedIntegration = await storage.getUserIntegration(targetUserId);
          res.json({
              success: true,
              channelId: updatedIntegration?.googleCalendarWebhookChannelId,
              expiry: updatedIntegration?.googleCalendarWebhookExpiry,
              expiryDate: updatedIntegration?.googleCalendarWebhookExpiry
                  ? new Date(updatedIntegration.googleCalendarWebhookExpiry).toISOString()
                  : null,
          });
      }
      catch (error: any) {
          console.error("Error registering webhook:", error);
          res.status(500).json({ message: error.message || "Failed to register webhook" });
      }
  });
}
