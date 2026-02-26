import type { Express } from "express";
import { setupCalendarWatch } from "../../calendarSync";
import { storage } from "../../storage";

async function getTenantByIdOrSlugOr404(tenantIdOrSlug: string, res: any) {
  const tenant = await storage.getTenantByIdOrSlug(tenantIdOrSlug);
  if (!tenant) {
    res.status(404).json({ message: "Tenant not found" });
    return null;
  }
  return tenant;
}

async function getActiveTenantUsers(tenant: { id: string; slug?: string | null }) {
  let tenantUsers = await storage.listTenantUsers(tenant.id);
  if (tenantUsers.length === 0 && tenant.slug) {
    tenantUsers = await storage.listTenantUsers(tenant.slug);
  }
  return tenantUsers.filter((u) => u.isActive !== false);
}

export function registerSuperAdminTenantWebhooksRoutes(
  app: Express,
  deps: { requireSuperAdmin: any }
): void {
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

  app.post(
    "/api/super-admin/tenants/:tenantId/webhooks/bulk-register",
    deps.requireSuperAdmin,
    async (req: any, res) => {
      try {
        const { tenantId: tenantIdOrSlug } = req.params;
        const tenant = await getTenantByIdOrSlugOr404(tenantIdOrSlug, res);
        if (!tenant) return;

        const users = await getActiveTenantUsers(tenant);
        const results = {
          total: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          details: [] as any[],
        };

        for (const u of users) {
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
              results.details.push({
                userId: u.id,
                email: u.email,
                status: "success",
              });
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
        console.error("Error bulk registering tenant webhooks:", error);
        res.status(500).json({ message: error.message || "Failed to bulk register webhooks" });
      }
    }
  );

  app.post(
    "/api/super-admin/tenants/:tenantId/webhooks/:userId/register",
    deps.requireSuperAdmin,
    async (req: any, res) => {
      try {
        const { tenantId: tenantIdOrSlug, userId: targetUserId } = req.params;
        const tenant = await getTenantByIdOrSlugOr404(tenantIdOrSlug, res);
        if (!tenant) return;

        const targetUser = await storage.getUser(targetUserId);
        if (!targetUser) {
          return res.status(404).json({ message: "User not found" });
        }

        let userRole = await storage.getUserTenantRole(targetUserId, tenant.id);
        if (!userRole && tenant.slug) {
          userRole = await storage.getUserTenantRole(targetUserId, tenant.slug);
        }
        if (!userRole) {
          return res.status(404).json({ message: "User not found in this tenant" });
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
        console.error("Error registering tenant webhook:", error);
        res.status(500).json({ message: error.message || "Failed to register webhook" });
      }
    }
  );
}
