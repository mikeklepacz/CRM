import { google } from "googleapis";
import { storage } from "../../storage";

export async function handleIntegrationsGoogleCalendarDisconnect(req: any, res: any): Promise<any> {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

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

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

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

    await (storage as any).updateUserIntegration(userId, {
      googleCalendarAccessToken: null,
      googleCalendarRefreshToken: null,
      googleCalendarTokenExpiry: null,
      googleCalendarEmail: null,
      googleCalendarConnectedAt: null,
      googleCalendarWebhookChannelId: null,
      googleCalendarWebhookResourceId: null,
      googleCalendarWebhookExpiry: null,
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error disconnecting Google Calendar:", error);
    res.status(500).json({ message: error.message || "Failed to disconnect Google Calendar" });
  }
}
