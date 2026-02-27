import { setupCalendarWatch } from "../../calendarSync";
import { storage } from "../../storage";
import { getActiveUsers } from "./adminWebhooks.helpers";

export async function handleAdminWebhooksBulkRegister(_req: any, res: any): Promise<any> {
  try {
    const activeUsers = await getActiveUsers();
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
}
