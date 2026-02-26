import type { Express } from "express";
import { setupCalendarWatch } from "../../calendarSync";
import { storage } from "../../storage";

type Deps = {
  isAdmin: any;
  isAuthenticatedCustom: any;
};

export function registerAdminWebhooksRoutes(app: Express, deps: Deps): void {
  app.get("/api/admin/webhooks", deps.isAuthenticatedCustom, deps.isAdmin, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      const activeUsers = users.filter((user) => user.isActive !== false);
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

  app.post("/api/admin/webhooks/bulk-register", deps.isAuthenticatedCustom, deps.isAdmin, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      const activeUsers = users.filter((user) => user.isActive !== false);
      const results = {
        total: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        details: [] as any[],
      };

      for (const user of activeUsers) {
        const integration = await storage.getUserIntegration(user.id);

        if (!integration?.googleCalendarAccessToken) {
          results.skipped++;
          results.details.push({
            userId: user.id,
            email: user.email,
            status: "skipped",
            reason: "No Google Calendar connected",
          });
          continue;
        }

        results.total++;
        try {
          const success = await setupCalendarWatch(user.id);
          if (success) {
            results.successful++;
            results.details.push({
              userId: user.id,
              email: user.email,
              status: "success",
            });
          } else {
            results.failed++;
            results.details.push({
              userId: user.id,
              email: user.email,
              status: "failed",
              reason: "Setup returned false",
            });
          }
        } catch (error: any) {
          results.failed++;
          results.details.push({
            userId: user.id,
            email: user.email,
            status: "failed",
            reason: error.message,
          });
        }
      }

      res.json(results);
    } catch (error: any) {
      console.error("Error bulk registering webhooks:", error);
      res.status(500).json({ message: error.message || "Failed to bulk register webhooks" });
    }
  });

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
