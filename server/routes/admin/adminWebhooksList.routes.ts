import type { Express } from "express";
import { storage } from "../../storage";
import { getActiveUsers } from "./adminWebhooks.helpers";
import type { AdminWebhooksDeps } from "./adminWebhooks.types";

export function registerAdminWebhooksListRoute(app: Express, deps: AdminWebhooksDeps): void {
  app.get("/api/admin/webhooks", deps.isAuthenticatedCustom, deps.isAdmin, async (_req, res) => {
    try {
      const activeUsers = await getActiveUsers();
      const webhookStatuses = [];

      for (const user of activeUsers) {
        const integration = await storage.getUserIntegration(user.id);

        let registeredUrl = "Not configured";
        if (process.env.REPLIT_DOMAINS) {
          const domains = process.env.REPLIT_DOMAINS.split(",");
          registeredUrl = `https://${domains[0]}/api/webhooks/google-calendar`;
        } else if (process.env.REPLIT_DEV_DOMAIN) {
          registeredUrl = `https://${process.env.REPLIT_DEV_DOMAIN}/api/webhooks/google-calendar`;
        }

        webhookStatuses.push({
          userId: user.id,
          userEmail: user.email,
          agentName: user.agentName,
          hasGoogleCalendar: !!integration?.googleCalendarAccessToken,
          channelId: integration?.googleCalendarWebhookChannelId || null,
          resourceId: integration?.googleCalendarWebhookResourceId || null,
          expiry: integration?.googleCalendarWebhookExpiry || null,
          expiryDate: integration?.googleCalendarWebhookExpiry
            ? new Date(integration.googleCalendarWebhookExpiry).toISOString()
            : null,
          isExpired: integration?.googleCalendarWebhookExpiry ? integration.googleCalendarWebhookExpiry < Date.now() : null,
          registeredUrl,
          environment: process.env.REPLIT_DOMAINS ? "production" : "development",
        });
      }

      res.json({ webhooks: webhookStatuses });
    } catch (error: any) {
      console.error("Error fetching webhook statuses:", error);
      res.status(500).json({ message: error.message || "Failed to fetch webhook statuses" });
    }
  });
}
