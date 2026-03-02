import { setupCalendarWatch } from "../../calendarSync";
import { storage } from "../../storage";
import { getActiveTenantUsers, getTenantByIdOrSlugOr404 } from "./superAdminTenantWebhooks.helpers";

export async function handleSuperAdminTenantWebhooksBulkRegister(req: any, res: any): Promise<any> {
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
