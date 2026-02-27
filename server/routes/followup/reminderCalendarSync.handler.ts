import { google } from "googleapis";
import { storage } from "../../storage";

export async function handleReminderCalendarSync(req: any, res: any): Promise<any> {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
    const integration = await storage.getUserIntegration(userId);
    if (!integration?.googleCalendarAccessToken) {
      return res.status(400).json({ message: "Google Calendar not connected. Please connect in Settings." });
    }
    const tenantId = req.user.tenantId;
    const userPreferences = await storage.getUserPreferences(userId, tenantId);
    const defaultCalendarReminders = userPreferences?.defaultCalendarReminders || [{ method: "popup", minutes: 10 }];
    const reminders = await storage.getRemindersByUser(userId, tenantId);
    const activeReminders = reminders.filter((r) => r.isActive && r.nextTrigger && !r.storeMetadata?.calendarEventId);
    let accessToken = integration.googleCalendarAccessToken;
    if (integration.googleCalendarTokenExpiry && integration.googleCalendarTokenExpiry < Date.now()) {
      if (integration.googleCalendarRefreshToken && integration.googleClientId && integration.googleClientSecret) {
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: integration.googleClientId,
            client_secret: integration.googleClientSecret,
            refresh_token: integration.googleCalendarRefreshToken,
            grant_type: "refresh_token",
          }),
        });
        if (tokenResponse.ok) {
          const tokens = await tokenResponse.json();
          accessToken = tokens.access_token;
          await storage.updateUserIntegration(userId, {
            googleCalendarAccessToken: tokens.access_token,
            googleCalendarTokenExpiry: Date.now() + tokens.expires_in * 1000,
          });
        }
      }
    }
    const oauth2Client = new google.auth.OAuth2(integration.googleClientId as string | undefined, integration.googleClientSecret as string | undefined);
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: integration.googleCalendarRefreshToken || undefined,
    });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    let syncedCount = 0;
    let errorCount = 0;
    for (const reminder of activeReminders) {
      try {
        let eventDescription = reminder.description || "";
        if (reminder.storeMetadata) {
          const contactParts: string[] = [];
          if (reminder.storeMetadata.pointOfContact) {
            contactParts.push(`Contact: ${reminder.storeMetadata.pointOfContact}`);
          }
          if (reminder.storeMetadata.pocEmail) {
            contactParts.push(`Email: ${reminder.storeMetadata.pocEmail}`);
          }
          if (reminder.storeMetadata.pocPhone) {
            contactParts.push(`Phone: ${reminder.storeMetadata.pocPhone}`);
          }
          if (contactParts.length > 0) {
            eventDescription = eventDescription ? `${eventDescription}\n\n${contactParts.join("\n")}` : contactParts.join("\n");
          }
        }
        let location = "";
        if (reminder.storeMetadata) {
          const addressParts: string[] = [];
          if (reminder.storeMetadata.address)
            addressParts.push(reminder.storeMetadata.address);
          if (reminder.storeMetadata.city)
            addressParts.push(reminder.storeMetadata.city);
          if (reminder.storeMetadata.state)
            addressParts.push(reminder.storeMetadata.state);
          location = addressParts.join(", ");
        }
        const triggerDate = new Date(reminder.nextTrigger as any);
        const endTime = new Date(triggerDate.getTime() + 30 * 60 * 1000);
        const timezone = reminder.reminderTimeZone || "UTC";
        const event = {
          summary: reminder.title,
          description: eventDescription,
          location: location || undefined,
          start: {
            dateTime: triggerDate.toISOString(),
            timeZone: timezone,
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: timezone,
          },
          reminders: {
            useDefault: false,
            overrides: defaultCalendarReminders.map((r: any) => ({ method: r.method, minutes: r.minutes })),
          },
        };
        const createdEvent = await calendar.events.insert({
          calendarId: "primary",
          requestBody: event,
        });
        if (createdEvent.data.id) {
          await storage.updateReminder(reminder.id, tenantId, {
            googleCalendarEventId: createdEvent.data.id,
          });
        }
        syncedCount++;
        console.log(`[Calendar Sync] Created event ${createdEvent.data.id} for reminder ${reminder.id}`);
      }
      catch (error: any) {
        errorCount++;
        console.error(`[Calendar Sync] Failed to create event for reminder ${reminder.id}:`, error.message);
      }
    }
    res.json({
      success: true,
      syncedCount,
      errorCount,
      totalReminders: activeReminders.length,
      message: `Synced ${syncedCount} of ${activeReminders.length} reminders to Google Calendar`,
    });
  }
  catch (error: any) {
    console.error("Error syncing reminders to calendar:", error);
    res.status(500).json({ message: error.message || "Failed to sync reminders" });
  }
}
