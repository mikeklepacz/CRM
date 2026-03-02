import { google } from "googleapis";
import { storage } from "../../../storage";

async function refreshSystemTokenIfNeeded(userIntegration: any): Promise<string> {
  let accessToken = userIntegration.googleCalendarAccessToken;

  if (!userIntegration.googleCalendarTokenExpiry || userIntegration.googleCalendarTokenExpiry >= Date.now()) {
    return accessToken;
  }

  if (!userIntegration.googleCalendarRefreshToken) {
    return accessToken;
  }

  const systemIntegration = await storage.getSystemIntegration("google_sheets");
  if (!systemIntegration?.googleClientId || !systemIntegration?.googleClientSecret) {
    return accessToken;
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: systemIntegration.googleClientId,
      client_secret: systemIntegration.googleClientSecret,
      refresh_token: userIntegration.googleCalendarRefreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) return accessToken;

  const tokens = await tokenResponse.json();
  accessToken = tokens.access_token;
  await storage.updateUserIntegration(userIntegration.userId, {
    googleCalendarAccessToken: tokens.access_token,
    googleCalendarTokenExpiry: Date.now() + tokens.expires_in * 1000,
  });

  return accessToken;
}

export async function processCalendarWebhook(headers: Record<string, any>): Promise<void> {
  const channelId = headers["x-goog-channel-id"];
  const resourceState = headers["x-goog-resource-state"];
  const resourceId = headers["x-goog-resource-id"];
  console.log("[Webhook] Received Google Calendar notification:", { channelId, resourceState, resourceId });

  if (resourceState === "sync") {
    console.log("[Webhook] Sync message received, webhook active");
    return;
  }

  const users = await storage.getAllUserIntegrations();
  const userIntegration = users.find((user: any) => user.googleCalendarWebhookChannelId === channelId);
  if (!userIntegration) {
    console.log("[Webhook] No user found for channel ID:", channelId);
    return;
  }

  const userId = userIntegration.userId;
  console.log("[Webhook] Processing calendar changes for user:", userId);

  const webhookUser = await storage.getUserById(userId);
  const tenantId = webhookUser?.tenantId || "";
  if (!tenantId) {
    console.log("[Webhook] No tenantId found for user:", userId);
    return;
  }

  const systemIntegration = await storage.getSystemIntegration("google_sheets");
  if (!systemIntegration?.googleClientId || !systemIntegration?.googleClientSecret) {
    console.error("[Webhook] System OAuth not configured");
    return;
  }

  const accessToken = await refreshSystemTokenIfNeeded(userIntegration);
  const oauth2Client = new google.auth.OAuth2(systemIntegration.googleClientId, systemIntegration.googleClientSecret);
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: userIntegration.googleCalendarRefreshToken || undefined,
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const reminders = await storage.getRemindersByUser(userId, tenantId);

  for (const reminder of reminders) {
    const calendarEventId = reminder.googleCalendarEventId;
    if (!calendarEventId) continue;

    try {
      const eventResponse = await calendar.events.get({ calendarId: "primary", eventId: calendarEventId });
      const event = eventResponse.data;

      if (event.status === "cancelled") {
        console.log(`[Webhook] Calendar event ${calendarEventId} deleted, deleting reminder ${reminder.id}`);
        await storage.deleteReminder(reminder.id, tenantId);
        continue;
      }

      if (event.updated) {
        const eventStartDateTime = event.start?.dateTime;
        const eventTimeZone = event.start?.timeZone || reminder.timezone;
        if (eventStartDateTime && eventTimeZone) {
          const dateTimeParts = eventStartDateTime.split("T");
          const newScheduledDate = dateTimeParts[0];
          const timePart = dateTimeParts[1].split("+")[0].split("-")[0].split("Z")[0];
          const newScheduledTime = timePart.substring(0, 5);

          if (newScheduledDate !== reminder.scheduledDate || newScheduledTime !== reminder.scheduledTime) {
            console.log(`[Webhook] Calendar event ${calendarEventId} time changed, updating reminder ${reminder.id}`);
            console.log(`[Webhook] Old: ${reminder.scheduledDate} ${reminder.scheduledTime}, New: ${newScheduledDate} ${newScheduledTime}`);
            await storage.updateReminder(reminder.id, tenantId, {
              scheduledDate: newScheduledDate,
              scheduledTime: newScheduledTime,
              timezone: eventTimeZone,
            });
          }
        }

        if (event.summary && event.summary !== reminder.title) {
          await storage.updateReminder(reminder.id, tenantId, { title: event.summary });
        }
      }
    } catch (eventError: any) {
      if (eventError.code === 404 || eventError.status === 404) {
        await storage.deleteReminder(reminder.id, tenantId);
      }
    }
  }
}
