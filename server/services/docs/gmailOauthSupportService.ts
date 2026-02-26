import { google } from "googleapis";
import { setupCalendarWatch } from "../../calendarSync";
import { storage } from "../../storage";

class GmailOauthHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "GmailOauthHttpError";
  }
}

function getUserId(authUser: any): string {
  return authUser.isPasswordAuth ? authUser.id : authUser.claims.sub;
}

export function isGmailOauthHttpError(error: unknown): error is { status: number; message: string } {
  return error instanceof GmailOauthHttpError;
}

export async function createGmailOauthUrl(params: {
  authUser: any;
  protocol: string;
  host: string;
}): Promise<string> {
  const { authUser, protocol, host } = params;
  const userId = getUserId(authUser);
  const systemIntegration = await storage.getSystemIntegration("google_sheets");
  if (!systemIntegration?.googleClientId) {
    throw new GmailOauthHttpError(400, "Google OAuth not configured. Please contact admin.");
  }

  const redirectUri = `${protocol}://${host}/api/gmail/callback`;
  const scope =
    "https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.labels https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar";

  const oauthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  oauthUrl.searchParams.set("client_id", systemIntegration.googleClientId);
  oauthUrl.searchParams.set("redirect_uri", redirectUri);
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set("scope", scope);
  oauthUrl.searchParams.set("access_type", "offline");
  oauthUrl.searchParams.set("prompt", "consent");
  oauthUrl.searchParams.set("state", userId);

  return oauthUrl.toString();
}

export async function processGmailOauthCallback(params: {
  code: unknown;
  userId: unknown;
  protocol: string;
  host: string;
}): Promise<string> {
  const { code, userId, protocol, host } = params;
  if (!code || !userId) {
    return '<script>alert("Authorization failed"); window.close();</script>';
  }

  const tenantInfo = await storage.getUserDefaultTenant(String(userId));
  if (!tenantInfo) {
    console.error(`[Gmail Callback] Failed to find default tenant for user ${userId}`);
    return '<script>alert("User tenant not found"); window.close();</script>';
  }

  const systemIntegration = await storage.getSystemIntegration("google_sheets");
  if (!systemIntegration?.googleClientId || !systemIntegration?.googleClientSecret) {
    return '<script>alert("Missing OAuth credentials"); window.close();</script>';
  }

  const redirectUri = `${protocol}://${host}/api/gmail/callback`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: String(code),
      client_id: systemIntegration.googleClientId,
      client_secret: systemIntegration.googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error("❌ Gmail token exchange failed:", error);
    return '<script>alert("Authentication failed"); window.close();</script>';
  }

  const tokens = await tokenResponse.json();
  const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userinfo = await userinfoResponse.json();

  const expiryTimestamp = Date.now() + tokens.expires_in * 1000;
  await (storage as any).updateUserIntegration(
    String(userId),
    {
      tenantId: tenantInfo.tenantId,
      googleClientId: systemIntegration.googleClientId,
      googleClientSecret: systemIntegration.googleClientSecret,
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token,
      googleTokenExpiry: expiryTimestamp,
      googleEmail: userinfo.email,
      googleCalendarAccessToken: tokens.access_token,
      googleCalendarRefreshToken: tokens.refresh_token,
      googleCalendarTokenExpiry: expiryTimestamp,
      googleCalendarEmail: userinfo.email,
      googleCalendarConnectedAt: new Date(),
    },
    tenantInfo.tenantId
  );

  setImmediate(async () => {
    try {
      const success = await setupCalendarWatch(String(userId));
      if (success) {
        console.log(`[CalendarWatch] Successfully set up watch channel for user ${userId}`);
      }
    } catch (error: any) {
      console.error("[CalendarWatch] Failed to setup watch:", error.message);
    }
  });

  return '<script>alert("Gmail and Calendar connected successfully!"); window.close();</script>';
}

export async function disconnectGmail(authUser: any): Promise<void> {
  const userId = getUserId(authUser);
  const integration = await storage.getUserIntegration(userId);

  if (
    integration?.googleCalendarWebhookChannelId &&
    integration?.googleCalendarWebhookResourceId &&
    integration?.googleCalendarAccessToken
  ) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        integration.googleClientId as string | undefined,
        integration.googleClientSecret as string | undefined
      );
      oauth2Client.setCredentials({
        access_token: integration.googleCalendarAccessToken,
        refresh_token: integration.googleCalendarRefreshToken || undefined,
      });

      const calendar = google.calendar({ auth: oauth2Client, version: "v3" });
      await calendar.channels.stop({
        requestBody: {
          id: integration.googleCalendarWebhookChannelId,
          resourceId: integration.googleCalendarWebhookResourceId,
        },
      });
      console.log("[Calendar Webhook] Stopped webhook on disconnect:", integration.googleCalendarWebhookChannelId);
    } catch (stopError: any) {
      console.error("[Calendar Webhook] Failed to stop webhook on disconnect:", stopError.message);
    }
  }

  await storage.updateUserIntegration(userId, {
    googleCalendarAccessToken: null,
    googleCalendarRefreshToken: null,
    googleCalendarTokenExpiry: null,
    googleCalendarEmail: null,
    googleCalendarConnectedAt: null,
    googleCalendarWebhookChannelId: null,
    googleCalendarWebhookResourceId: null,
    googleCalendarWebhookExpiry: null,
  });
}
