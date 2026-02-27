import type { Express } from "express";
import { setupCalendarWatch } from "../../calendarSync";
import { storage } from "../../storage";
import type { AdminWebhooksDeps } from "./adminWebhooks.types";

export function registerAdminWebhooksRegisterSingleRoute(app: Express, deps: AdminWebhooksDeps): void {
  app.post(
    "/api/admin/webhooks/:userId/register",
    deps.isAuthenticatedCustom,
    deps.isAdmin,
    async (req, res) => {
      try {
        const { userId } = req.params;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const integration = await storage.getUserIntegration(userId);
        if (!integration?.googleCalendarAccessToken) {
          return res.status(400).json({ message: "User does not have Google Calendar connected" });
        }

        const success = await setupCalendarWatch(userId);
        if (!success) {
          return res.status(500).json({
            success: false,
            message: "Webhook registration failed",
          });
        }

        const updatedIntegration = await storage.getUserIntegration(userId);
        res.json({
          success: true,
          channelId: updatedIntegration?.googleCalendarWebhookChannelId,
          expiry: updatedIntegration?.googleCalendarWebhookExpiry,
          expiryDate: updatedIntegration?.googleCalendarWebhookExpiry
            ? new Date(updatedIntegration.googleCalendarWebhookExpiry).toISOString()
            : null,
        });
      } catch (error: any) {
        console.error("Error registering webhook:", error);
        res.status(500).json({ message: error.message || "Failed to register webhook" });
      }
    }
  );
}
