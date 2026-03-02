import type { Express } from "express";
import { setupCalendarWatch } from "../../calendarSync";
import { storage } from "../../storage";
import { getTenantByIdOrSlugOr404 } from "./superAdminTenantWebhooks.helpers";
import type { SuperAdminTenantWebhooksDeps } from "./superAdminTenantWebhooks.types";

export function registerSuperAdminTenantWebhooksRegisterSingleRoute(
  app: Express,
  deps: SuperAdminTenantWebhooksDeps,
): void {
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
