import type { Express } from "express";
import { setupCalendarWatch } from "../../calendarSync";
import { storage } from "../../storage";

async function requireSuperAdminFromSession(req: any, res: any) {
  const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
  const user = await storage.getUser(userId);
  if (!user?.isSuperAdmin) {
    res.status(403).json({ message: "Super admin access required" });
    return null;
  }
  return user;
}

export function registerSuperAdminTicketsWebhooksRoutes(
  app: Express,
  deps: { isAuthenticatedCustom: any }
): void {
  app.get("/api/super-admin/tickets", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const superAdmin = await requireSuperAdminFromSession(req, res);
      if (!superAdmin) return;

      const tenantId = req.query.tenantId as string | undefined;
      let allTickets = await storage.getAllTickets();

      if (tenantId && tenantId !== "all") {
        allTickets = allTickets.filter((t) => t.tenantId === tenantId);
      }

      const ticketsWithInfo = await Promise.all(
        allTickets.map(async (ticket) => {
          const ticketUser = await storage.getUser(ticket.userId);
          let tenantName = "Unknown Tenant";
          if (ticket.tenantId) {
            const tenant = await storage.getTenantById(ticket.tenantId);
            tenantName = tenant?.name || "Unknown Tenant";
          }
          return {
            ...ticket,
            tenantName,
            userEmail: ticketUser?.email,
            userName:
              ticketUser?.firstName && ticketUser?.lastName
                ? `${ticketUser.firstName} ${ticketUser.lastName}`
                : undefined,
          };
        })
      );

      res.json({ tickets: ticketsWithInfo });
    } catch (error: any) {
      console.error("Error fetching super admin tickets:", error);
      res.status(500).json({ message: error.message || "Failed to fetch tickets" });
    }
  });

  app.get("/api/super-admin/webhooks", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const superAdmin = await requireSuperAdminFromSession(req, res);
      if (!superAdmin) return;

      const tenantId = req.query.tenantId as string | undefined;
      let users = await storage.getAllUsers();

      if (tenantId && tenantId !== "all") {
        users = users.filter((u) => u.tenantId === tenantId);
      }

      const activeUsers = users.filter((u) => u.isActive !== false);
      const webhookStatuses = [];

      for (const u of activeUsers) {
        const integration = await storage.getUserIntegration(u.id);
        let tenantName = "Unknown Tenant";
        if (u.tenantId) {
          const tenant = await storage.getTenantById(u.tenantId);
          tenantName = tenant?.name || "Unknown Tenant";
        }

        let registeredUrl = "Not configured";
        if (process.env.REPLIT_DOMAINS) {
          const domains = process.env.REPLIT_DOMAINS.split(",");
          registeredUrl = `https://${domains[0]}/api/webhooks/google-calendar`;
        } else if (process.env.REPLIT_DEV_DOMAIN) {
          registeredUrl = `https://${process.env.REPLIT_DEV_DOMAIN}/api/webhooks/google-calendar`;
        }

        webhookStatuses.push({
          userId: u.id,
          userEmail: u.email,
          agentName: u.agentName,
          tenantId: u.tenantId,
          tenantName,
          hasGoogleCalendar: !!integration?.googleCalendarAccessToken,
          channelId: integration?.googleCalendarWebhookChannelId || null,
          resourceId: integration?.googleCalendarWebhookResourceId || null,
          expiry: integration?.googleCalendarWebhookExpiry || null,
          expiryDate: integration?.googleCalendarWebhookExpiry
            ? new Date(integration.googleCalendarWebhookExpiry).toISOString()
            : null,
          isExpired: integration?.googleCalendarWebhookExpiry
            ? integration.googleCalendarWebhookExpiry < Date.now()
            : null,
          registeredUrl,
          environment: process.env.REPLIT_DOMAINS ? "production" : "development",
        });
      }

      res.json({ webhooks: webhookStatuses });
    } catch (error: any) {
      console.error("Error fetching super admin webhook statuses:", error);
      res.status(500).json({ message: error.message || "Failed to fetch webhook statuses" });
    }
  });

  app.post("/api/super-admin/webhooks/bulk-register", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const superAdmin = await requireSuperAdminFromSession(req, res);
      if (!superAdmin) return;

      const { tenantId } = req.body;
      let users = await storage.getAllUsers();
      if (tenantId && tenantId !== "all") {
        users = users.filter((u) => u.tenantId === tenantId);
      }

      const activeUsers = users.filter((u) => u.isActive !== false);
      const results = {
        total: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        details: [] as any[],
      };

      for (const u of activeUsers) {
        const integration = await storage.getUserIntegration(u.id);
        if (!integration?.googleCalendarAccessToken) {
          results.skipped++;
          results.details.push({
            userId: u.id,
            email: u.email,
            status: "skipped",
            reason: "No Google Calendar connected",
          });
          continue;
        }

        results.total++;
        try {
          const success = await setupCalendarWatch(u.id);
          if (success) {
            results.successful++;
            results.details.push({ userId: u.id, email: u.email, status: "success" });
          } else {
            results.failed++;
            results.details.push({
              userId: u.id,
              email: u.email,
              status: "failed",
              reason: "Setup returned false",
            });
          }
        } catch (error: any) {
          results.failed++;
          results.details.push({
            userId: u.id,
            email: u.email,
            status: "failed",
            reason: error.message,
          });
        }
      }

      res.json(results);
    } catch (error: any) {
      console.error("Error super admin bulk registering webhooks:", error);
      res.status(500).json({ message: error.message || "Failed to bulk register webhooks" });
    }
  });

  app.post("/api/super-admin/webhooks/:userId/register", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const superAdmin = await requireSuperAdminFromSession(req, res);
      if (!superAdmin) return;

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
    } catch (error: any) {
      console.error("Error registering webhook:", error);
      res.status(500).json({ message: error.message || "Failed to register webhook" });
    }
  });
}
