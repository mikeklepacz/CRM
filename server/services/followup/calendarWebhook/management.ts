import { google } from "googleapis";
import { setupCalendarWatch } from "../../../calendarSync";
import { storage } from "../../../storage";

type HttpError = Error & { statusCode?: number };

export type WebhookStatus = {
  state: "disconnected" | "missing" | "expired" | "active";
  expiresAt: number | null;
  remainingMs: number | null;
  reRegisterRecommended: boolean;
};

function httpError(statusCode: number, message: string): HttpError {
  const error = new Error(message) as HttpError;
  error.statusCode = statusCode;
  return error;
}

export function getCalendarWebhookErrorStatusCode(error: unknown): number | null {
  if (typeof error !== "object" || !error) return null;
  const statusCode = (error as HttpError).statusCode;
  return typeof statusCode === "number" ? statusCode : null;
}

export async function getCalendarWebhookStatusForUser(userId: string): Promise<WebhookStatus> {
  const integration = await storage.getUserIntegration(userId);
  if (!integration?.googleCalendarAccessToken) {
    return {
      state: "disconnected",
      expiresAt: null,
      remainingMs: null,
      reRegisterRecommended: false,
    };
  }

  if (!integration.googleCalendarWebhookChannelId || !integration.googleCalendarWebhookExpiry) {
    return {
      state: "missing",
      expiresAt: null,
      remainingMs: null,
      reRegisterRecommended: true,
    };
  }

  const now = Date.now();
  const expiresAt = integration.googleCalendarWebhookExpiry;
  const remainingMs = expiresAt - now;
  if (remainingMs <= 0) {
    return {
      state: "expired",
      expiresAt,
      remainingMs: 0,
      reRegisterRecommended: true,
    };
  }

  const oneDayMs = 24 * 60 * 60 * 1000;
  return {
    state: "active",
    expiresAt,
    remainingMs,
    reRegisterRecommended: remainingMs < oneDayMs,
  };
}

export async function reregisterCalendarWebhookForUser(userId: string): Promise<{
  message: string;
  state: "active";
  expiresAt: number | null;
  remainingMs: number | null;
}> {
  const integration = await storage.getUserIntegration(userId);
  if (!integration?.googleCalendarAccessToken) {
    throw httpError(400, "Google Calendar not connected. Please connect your calendar first.");
  }

  if (integration.googleCalendarWebhookChannelId && integration.googleCalendarWebhookResourceId) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        integration.googleClientId as string | undefined,
        integration.googleClientSecret as string | undefined
      );
      oauth2Client.setCredentials({
        access_token: integration.googleCalendarAccessToken,
        refresh_token: integration.googleCalendarRefreshToken || undefined,
      });
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      await calendar.channels.stop({
        requestBody: {
          id: integration.googleCalendarWebhookChannelId,
          resourceId: integration.googleCalendarWebhookResourceId,
        },
      });
      console.log("[Webhook Re-register] Stopped old webhook:", integration.googleCalendarWebhookChannelId);
    } catch (stopError: any) {
      console.log("[Webhook Re-register] Failed to stop old webhook (may already be expired):", stopError.message);
    }
  }

  const success = await setupCalendarWatch(userId);
  if (!success) {
    throw httpError(500, "Failed to register webhook. Please try again.");
  }

  const updatedIntegration = await storage.getUserIntegration(userId);
  return {
    message: "Webhook registered successfully",
    state: "active",
    expiresAt: updatedIntegration?.googleCalendarWebhookExpiry || null,
    remainingMs: updatedIntegration?.googleCalendarWebhookExpiry
      ? updatedIntegration.googleCalendarWebhookExpiry - Date.now()
      : null,
  };
}
