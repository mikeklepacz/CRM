import { setupCalendarWatch } from "../../calendarSync";
import { storage } from "../../storage";
import { requireSuperAdminFromSession } from "./superAdminTicketsWebhooks.helpers";

export async function handleSuperAdminWebhooksBulkRegister(req: any, res: any): Promise<any> {
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
}
