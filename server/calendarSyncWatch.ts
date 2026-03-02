import { google } from 'googleapis';
import { storage } from './storage';

export async function setupCalendarWatch(userId: string): Promise<boolean> {
  try {
    const integration = await storage.getUserIntegration(userId);
    if (!integration?.googleCalendarAccessToken) {
      return false;
    }

    const systemIntegration = await storage.getSystemIntegration('google_sheets');
    if (!systemIntegration?.googleClientId || !systemIntegration?.googleClientSecret) {
      return false;
    }

    let accessToken = integration.googleCalendarAccessToken;
    if (integration.googleCalendarTokenExpiry && integration.googleCalendarTokenExpiry < Date.now()) {
      if (!integration.googleCalendarRefreshToken) {
        return false;
      }

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: systemIntegration.googleClientId,
          client_secret: systemIntegration.googleClientSecret,
          refresh_token: integration.googleCalendarRefreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!tokenResponse.ok) {
        return false;
      }

      const tokens = await tokenResponse.json();
      accessToken = tokens.access_token;
      await storage.updateUserIntegration(userId, {
        googleCalendarAccessToken: tokens.access_token,
        googleCalendarTokenExpiry: Date.now() + (tokens.expires_in * 1000)
      });
    }

    const oauth2Client = new google.auth.OAuth2(
      systemIntegration.googleClientId,
      systemIntegration.googleClientSecret
    );
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const channelId = `calendar-watch-${userId}-${Date.now()}`;

    let webhookUrl: string;
    if (process.env.REPLIT_DOMAINS) {
      const domains = process.env.REPLIT_DOMAINS.split(',');
      webhookUrl = `https://${domains[0]}/api/webhooks/google-calendar`;
    } else if (process.env.REPLIT_DEV_DOMAIN) {
      webhookUrl = `https://${process.env.REPLIT_DEV_DOMAIN}/api/webhooks/google-calendar`;
    } else {
      throw new Error('No REPLIT_DOMAINS or REPLIT_DEV_DOMAIN environment variable found');
    }

    const response = await calendar.events.watch({
      calendarId: 'primary',
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        token: userId,
      }
    });

    if (response.data.id && response.data.resourceId && response.data.expiration) {
      await storage.updateUserIntegration(userId, {
        googleCalendarWebhookChannelId: response.data.id,
        googleCalendarWebhookResourceId: response.data.resourceId,
        googleCalendarWebhookExpiry: parseInt(response.data.expiration)
      });

      return true;
    }

    return false;
  } catch (error: any) {
    return false;
  }
}

export async function cleanupDeletedCalendarEvents(userId: string, tenantId?: string): Promise<{ deleted: number; errors: number }> {
  try {
    const integration = await storage.getUserIntegration(userId);
    if (!integration?.googleCalendarAccessToken) {
      return { deleted: 0, errors: 0 };
    }

    const systemIntegration = await storage.getSystemIntegration('google_sheets');
    if (!systemIntegration?.googleClientId || !systemIntegration?.googleClientSecret) {
      return { deleted: 0, errors: 0 };
    }

    const user = await storage.getUserById(userId);
    const effectiveTenantId = tenantId || user?.tenantId || '';
    if (!effectiveTenantId) {
      console.error(`[CalendarCleanup] Missing tenantId for user ${userId}`);
      return { deleted: 0, errors: 0 };
    }

    let accessToken = integration.googleCalendarAccessToken;
    if (integration.googleCalendarTokenExpiry && integration.googleCalendarTokenExpiry < Date.now()) {
      if (!integration.googleCalendarRefreshToken) {
        return { deleted: 0, errors: 0 };
      }

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: systemIntegration.googleClientId,
          client_secret: systemIntegration.googleClientSecret,
          refresh_token: integration.googleCalendarRefreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!tokenResponse.ok) {
        console.error('[CalendarCleanup] Token refresh failed');
        return { deleted: 0, errors: 0 };
      }

      const tokens = await tokenResponse.json();
      accessToken = tokens.access_token;
      await storage.updateUserIntegration(userId, {
        googleCalendarAccessToken: tokens.access_token,
        googleCalendarTokenExpiry: Date.now() + (tokens.expires_in * 1000)
      });
    }

    const oauth2Client = new google.auth.OAuth2(
      systemIntegration.googleClientId,
      systemIntegration.googleClientSecret
    );
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const reminders = await storage.getRemindersByUser(userId, effectiveTenantId);
    const linkedReminders = reminders.filter(r => r.googleCalendarEventId && !r.isCompleted);

    let deleted = 0;
    let errors = 0;

    for (const reminder of linkedReminders) {
      try {
        const eventResponse = await calendar.events.get({
          calendarId: 'primary',
          eventId: reminder.googleCalendarEventId!,
        });

        if (eventResponse.data.status === 'cancelled') {
          console.log(`[CalendarCleanup] Event ${reminder.googleCalendarEventId} cancelled, deleting reminder ${reminder.id}`);
          await storage.deleteReminder(reminder.id, effectiveTenantId);
          deleted++;
        }
      } catch (eventError: any) {
        if (eventError.code === 404 || eventError.status === 404) {
          console.log(`[CalendarCleanup] Event ${reminder.googleCalendarEventId} not found (404), deleting reminder ${reminder.id}`);
          await storage.deleteReminder(reminder.id, effectiveTenantId);
          deleted++;
        } else {
          errors++;
          console.error(`[CalendarCleanup] Error checking event ${reminder.googleCalendarEventId}: ${eventError.message}`);
        }
      }
    }

    if (deleted > 0) {
      console.log(`[CalendarCleanup] Cleaned up ${deleted} stale reminders for user ${userId}`);
    }

    return { deleted, errors };
  } catch (error: any) {
    console.error('[CalendarCleanup] Failed:', error.message);
    return { deleted: 0, errors: 0 };
  }
}

export async function renewCalendarWatchIfNeeded(userId: string): Promise<boolean> {
  try {
    const integration = await storage.getUserIntegration(userId);
    if (!integration?.googleCalendarWebhookChannelId || !integration.googleCalendarWebhookExpiry) {
      return false;
    }

    const expiryTime = integration.googleCalendarWebhookExpiry;
    const now = Date.now();
    const hoursUntilExpiry = (expiryTime - now) / (1000 * 60 * 60);

    if (hoursUntilExpiry > 24) {
      return false;
    }

    return await setupCalendarWatch(userId);
  } catch (error: any) {
    return false;
  }
}
