import type { Express } from "express";
import { storage } from "../../storage";
import { getActiveTenantUsers, getTenantByIdOrSlugOr404 } from "./superAdminTenantWebhooks.helpers";
import type { SuperAdminTenantWebhooksDeps } from "./superAdminTenantWebhooks.types";

export function registerSuperAdminTenantWebhooksListRoute(app: Express, deps: SuperAdminTenantWebhooksDeps): void {
  app.get("/api/super-admin/tenants/:tenantId/webhooks", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { tenantId: tenantIdOrSlug } = req.params;
      const tenant = await getTenantByIdOrSlugOr404(tenantIdOrSlug, res);
      if (!tenant) return;

      const users = await getActiveTenantUsers(tenant);
      const webhookStatuses = [];

      for (const u of users) {
        const integration = await storage.getUserIntegration(u.id);

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
          tenantId: tenant.id,
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
      console.error("Error fetching tenant webhook statuses:", error);
      res.status(500).json({ message: error.message || "Failed to fetch webhook statuses" });
    }
  });
}
