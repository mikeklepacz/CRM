import type { Express } from "express";
import { google } from "googleapis";
import { storage } from "../../storage";

export function registerReminderMutationRoutes(app: Express): void {
  // Update a reminder (PUT)
  app.put('/api/reminders/:id', async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      // Verify ownership
      const existing = await storage.getReminderById(id, tenantId);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: 'Reminder not found' });
      }

      const reminder = await storage.updateReminder(id, tenantId, req.body);
      res.json({ reminder });
    } catch (error: any) {
      console.error('Error updating reminder:', error);
      res.status(500).json({ message: error.message || 'Failed to update reminder' });
    }
  });

  // Update a reminder (PATCH)
  app.patch('/api/reminders/:id', async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      // Verify ownership
      const existing = await storage.getReminderById(id, tenantId);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: 'Reminder not found' });
      }

      const reminder = await storage.updateReminder(id, tenantId, req.body);
      res.json({ reminder });
    } catch (error: any) {
      console.error('Error updating reminder:', error);
      res.status(500).json({ message: error.message || 'Failed to update reminder' });
    }
  });

  // Delete a reminder
  app.delete('/api/reminders/:id', async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      // Verify ownership
      const existing = await storage.getReminderById(id, tenantId);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: 'Reminder not found' });
      }

      // Delete Google Calendar event if linked (best-effort, non-blocking)
      if (existing.googleCalendarEventId) {
        try {
          const integration = await storage.getUserIntegration(userId);
          if (integration?.googleCalendarAccessToken) {
            const systemIntegration = await storage.getSystemIntegration('google_sheets');
            if (systemIntegration?.googleClientId && systemIntegration?.googleClientSecret) {
              let accessToken = integration.googleCalendarAccessToken;
              if (integration.googleCalendarTokenExpiry && integration.googleCalendarTokenExpiry < Date.now()) {
                if (integration.googleCalendarRefreshToken) {
                  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                      client_id: systemIntegration.googleClientId,
                      client_secret: systemIntegration.googleClientSecret,
                      refresh_token: integration.googleCalendarRefreshToken,
                      grant_type: 'refresh_token',
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

              const oauth2Client = new google.auth.OAuth2(
                systemIntegration.googleClientId,
                systemIntegration.googleClientSecret
              );
              oauth2Client.setCredentials({
                access_token: accessToken,
                refresh_token: integration.googleCalendarRefreshToken || undefined,
              });

              const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
              await calendar.events.delete({
                calendarId: 'primary',
                eventId: existing.googleCalendarEventId,
              });
              console.log(`[Reminder Delete] Deleted Google Calendar event ${existing.googleCalendarEventId}`);
            }
          }
        } catch (calendarError: any) {
          console.error(`[Reminder Delete] Failed to delete calendar event: ${calendarError.message}`);
          // Non-blocking - continue with DB deletion even if calendar delete fails
        }
      }

      await storage.deleteReminder(id, tenantId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting reminder:', error);
      res.status(500).json({ message: error.message || 'Failed to delete reminder' });
    }
  });
}
