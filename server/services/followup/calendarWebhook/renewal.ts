import { google } from "googleapis";
import { storage } from "../../../storage";

let renewalSchedulerStarted = false;

export async function renewWebhooksIfNeeded(): Promise<void> {
  try {
    const allIntegrations = await storage.getAllUserIntegrations();
    const threeDaysFromNow = Date.now() + 3 * 24 * 60 * 60 * 1000;

    for (const integration of allIntegrations) {
      if (!integration.googleCalendarWebhookChannelId || !integration.googleCalendarAccessToken || !integration.googleCalendarWebhookExpiry) {
        continue;
      }

      const user = await storage.getUser(integration.userId);
      if (!user || user.isActive === false) continue;
      if (integration.googleCalendarWebhookExpiry >= threeDaysFromNow) continue;

      try {
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
              await storage.updateUserIntegration(integration.userId, {
                googleCalendarAccessToken: tokens.access_token,
                googleCalendarTokenExpiry: Date.now() + tokens.expires_in * 1000,
              });
            }
          }
        }

        if (integration.googleCalendarWebhookChannelId && integration.googleCalendarWebhookResourceId) {
          try {
            const oauth2Client = new google.auth.OAuth2(
              integration.googleClientId as string | undefined,
              integration.googleClientSecret as string | undefined
            );
            oauth2Client.setCredentials({
              access_token: accessToken,
              refresh_token: integration.googleCalendarRefreshToken || undefined,
            });
            const calendar = google.calendar({ version: "v3", auth: oauth2Client });
            await calendar.channels.stop({
              requestBody: {
                id: integration.googleCalendarWebhookChannelId,
                resourceId: integration.googleCalendarWebhookResourceId,
              },
            });
          } catch {
            // Old webhook may already be expired. Continue renewal.
          }
        }

        const webhookUrl = process.env.REPLIT_DEV_DOMAIN
          ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/webhooks/google-calendar`
          : `https://localhost:5000/api/webhooks/google-calendar`;
        const channelId = `calendar-${integration.userId}-${Date.now()}`;
        const expiration = Date.now() + 7 * 24 * 60 * 60 * 1000;

        const oauth2Client = new google.auth.OAuth2(
          integration.googleClientId as string | undefined,
          integration.googleClientSecret as string | undefined
        );
        oauth2Client.setCredentials({
          access_token: accessToken,
          refresh_token: integration.googleCalendarRefreshToken || undefined,
        });
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });
        const watchResponse = await calendar.events.watch({
          calendarId: "primary",
          requestBody: {
            id: channelId,
            type: "web_hook",
            address: webhookUrl,
            expiration: expiration.toString(),
          },
        });

        await storage.updateUserIntegration(integration.userId, {
          googleCalendarWebhookChannelId: channelId,
          googleCalendarWebhookResourceId: watchResponse.data.resourceId || undefined,
          googleCalendarWebhookExpiry: expiration,
        });
      } catch (renewError: any) {
        console.error(`[WebhookRenewal] Failed to renew webhook for user ${integration.userId}:`, renewError.message);
      }
    }
  } catch (error: any) {
    console.error("[WebhookRenewal] Renewal check failed:", error.message);
  }
}

export function startCalendarWebhookRenewalScheduler(): void {
  if (renewalSchedulerStarted) return;
  renewalSchedulerStarted = true;
  setInterval(renewWebhooksIfNeeded, 24 * 60 * 60 * 1000);
  setTimeout(renewWebhooksIfNeeded, 60 * 1000);
}
