import type { Express } from "express";
import type { SuperAdminTicketsWebhooksRouteDeps } from "./superAdminTicketsWebhooks.types";
import { requireSuperAdminFromSession } from "./superAdminTicketsWebhooks.helpers";
import { storage } from "../../storage";

export function registerSuperAdminWebhooksListRoute(app: Express, deps: SuperAdminTicketsWebhooksRouteDeps): void {
  app.get("/api/super-admin/webhooks", deps.isAuthenticatedCustom, async (req: any, res) => {
      try {
          const superAdmin = await requireSuperAdminFromSession(req, res);
          if (!superAdmin)
              return;
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
              }
              else if (process.env.REPLIT_DEV_DOMAIN) {
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
      }
      catch (error: any) {
          console.error("Error fetching super admin webhook statuses:", error);
          res.status(500).json({ message: error.message || "Failed to fetch webhook statuses" });
      }
  });
}
