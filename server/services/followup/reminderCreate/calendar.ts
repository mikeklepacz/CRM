import { google } from "googleapis";
import { storage } from "../../../storage";

type StoreMetadata = {
  pointOfContact?: string;
  pocEmail?: string;
  pocPhone?: string;
  address?: string;
  city?: string;
  state?: string;
};

type ReminderPayload = {
  reminderId: string;
  tenantId: string;
  userId: string;
  title: string;
  description: string | null;
  scheduledDate: string;
  scheduledTime: string;
  timezone: string;
  storeMetadata: StoreMetadata | null;
  calendarReminders?: Array<{ method: string; minutes: number }>;
};

function buildEventDescription(description: string | null, storeMetadata: StoreMetadata | null): string {
  let eventDescription = description || "";
  if (!storeMetadata) return eventDescription;

  const contactParts: string[] = [];
  if (storeMetadata.pointOfContact) contactParts.push(`Contact: ${storeMetadata.pointOfContact}`);
  if (storeMetadata.pocEmail) contactParts.push(`Email: ${storeMetadata.pocEmail}`);
  if (storeMetadata.pocPhone) contactParts.push(`Phone: ${storeMetadata.pocPhone}`);

  if (contactParts.length > 0) {
    eventDescription = eventDescription
      ? `${eventDescription}\n\n${contactParts.join("\n")}`
      : contactParts.join("\n");
  }

  return eventDescription;
}

function buildEventLocation(storeMetadata: StoreMetadata | null): string {
  if (!storeMetadata) return "";
  const addressParts: string[] = [];
  if (storeMetadata.address) addressParts.push(storeMetadata.address);
  if (storeMetadata.city) addressParts.push(storeMetadata.city);
  if (storeMetadata.state) addressParts.push(storeMetadata.state);
  return addressParts.join(", ");
}

function buildEndDateTime(scheduledDate: string, scheduledTime: string): string {
  const [hours, minutes] = scheduledTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + 30;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  const endTime = `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;

  let endDate = scheduledDate;
  if (totalMinutes >= 1440) {
    const [year, month, day] = scheduledDate.split("-").map(Number);
    const nextDayMs = Date.UTC(year, month - 1, day + 1);
    const nextDay = new Date(nextDayMs);
    endDate = nextDay.toISOString().split("T")[0];
  }

  return `${endDate}T${endTime}:00`;
}

async function getCalendarAccessToken(userId: string): Promise<string> {
  const integration = await storage.getUserIntegration(userId);
  if (!integration?.googleCalendarAccessToken) {
    throw new Error("Calendar integration not connected");
  }

  const systemIntegration = await storage.getSystemIntegration("google_sheets");
  if (!systemIntegration?.googleClientId || !systemIntegration?.googleClientSecret) {
    throw new Error("Google OAuth not configured");
  }

  if (!integration.googleCalendarTokenExpiry || integration.googleCalendarTokenExpiry >= Date.now()) {
    return integration.googleCalendarAccessToken;
  }

  if (!integration.googleCalendarRefreshToken) {
    throw new Error("Missing refresh token");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: systemIntegration.googleClientId,
      client_secret: systemIntegration.googleClientSecret,
      refresh_token: integration.googleCalendarRefreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Token refresh failed: ${tokenResponse.status}`);
  }

  const tokens = await tokenResponse.json();
  await storage.updateUserIntegration(userId, {
    googleCalendarAccessToken: tokens.access_token,
    googleCalendarTokenExpiry: Date.now() + tokens.expires_in * 1000,
  });

  return tokens.access_token;
}

export async function createCalendarEventForReminder(payload: ReminderPayload): Promise<void> {
  const integration = await storage.getUserIntegration(payload.userId);
  if (!integration?.googleCalendarAccessToken) return;

  const systemIntegration = await storage.getSystemIntegration("google_sheets");
  if (!systemIntegration?.googleClientId || !systemIntegration?.googleClientSecret) {
    throw new Error("Google OAuth not configured");
  }

  const accessToken = await getCalendarAccessToken(payload.userId);
  const oauth2Client = new google.auth.OAuth2(
    systemIntegration.googleClientId,
    systemIntegration.googleClientSecret
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: integration.googleCalendarRefreshToken || undefined,
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const startDateTime = `${payload.scheduledDate}T${payload.scheduledTime}:00`;
  const endDateTime = buildEndDateTime(payload.scheduledDate, payload.scheduledTime);
  const eventDescription = buildEventDescription(payload.description, payload.storeMetadata);
  const location = buildEventLocation(payload.storeMetadata);
  const reminderOverrides = payload.calendarReminders || [{ method: "popup", minutes: 10 }];

  const createdEvent = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: payload.title,
      description: eventDescription,
      location: location || undefined,
      start: { dateTime: startDateTime, timeZone: payload.timezone },
      end: { dateTime: endDateTime, timeZone: payload.timezone },
      reminders: {
        useDefault: false,
        overrides: reminderOverrides.map((reminder) => ({
          method: reminder.method,
          minutes: reminder.minutes,
        })),
      },
    },
  });

  if (createdEvent.data.id) {
    await storage.updateReminder(payload.reminderId, payload.tenantId, {
      googleCalendarEventId: createdEvent.data.id,
    });
  }
}
