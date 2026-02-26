import type { Express } from "express";
import { google } from "googleapis";
import { storage } from "../../storage";

type Deps = {
  isAuthenticatedCustom: any;
};

export function registerIntegrationsRoutes(app: Express, deps: Deps): void {
  // Get integration status for the current user
  app.get('/api/integrations/status', deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const integration = (await storage.getUserIntegration(userId)) as any;

      res.json({
        googleSheetsConnected: !!(integration?.googleAccessToken && integration?.googleRefreshToken),
        googleCalendarConnected: !!(integration?.googleCalendarAccessToken && integration?.googleCalendarRefreshToken),
        googleSheetsEmail: integration?.googleEmail || null,
        googleCalendarEmail: integration?.googleCalendarEmail || null,
      });
    } catch (error: any) {
      console.error('Error fetching integration status:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch integration status' });
    }
  });

  // Connect Google Calendar/Gmail - initiate OAuth flow
  app.post('/api/integrations/google-calendar/connect', deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // For now, return a message that integration setup is coming soon
      // In Phase 2-3, we'll implement the full OAuth flow using Replit's Google Calendar connector
      res.json({
        message:
          "Google Calendar integration setup is coming soon! This will use Replit's secure OAuth connector for a separate account.",
        authUrl: null,
      });
    } catch (error: any) {
      console.error('Error connecting Google Calendar:', error);
      res.status(500).json({ message: error.message || 'Failed to connect Google Calendar' });
    }
  });

  // Disconnect Google Sheets integration
  app.post('/api/integrations/google-sheets/disconnect', deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      // Clear Google Sheets tokens from user integration
      await (storage as any).updateUserIntegration(userId, {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
        googleEmail: null,
        googleConnectedAt: null,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error disconnecting Google Sheets:', error);
      res.status(500).json({ message: error.message || 'Failed to disconnect Google Sheets' });
    }
  });

  // Disconnect Google Calendar integration
  app.post('/api/integrations/google-calendar/disconnect', deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      // Stop webhook before disconnecting
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

          const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

          await calendar.channels.stop({
            requestBody: {
              id: integration.googleCalendarWebhookChannelId,
              resourceId: integration.googleCalendarWebhookResourceId,
            },
          });
          console.log('[Calendar Webhook] Stopped webhook on disconnect:', integration.googleCalendarWebhookChannelId);
        } catch (stopError: any) {
          console.error('[Calendar Webhook] Failed to stop webhook on disconnect:', stopError.message);
        }
      }

      // Clear Google Calendar tokens from user integration
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
      console.error('Error disconnecting Google Calendar:', error);
      res.status(500).json({ message: error.message || 'Failed to disconnect Google Calendar' });
    }
  });
}
