import { google } from 'googleapis';
import { storage } from './storage';
import { eventGateway } from './services/events/gateway';
export { cleanupDeletedCalendarEvents, renewCalendarWatchIfNeeded, setupCalendarWatch } from './calendarSyncWatch';

export async function syncRemindersToCalendar(userId: string, tenantId?: string): Promise<{ created: number; errors: number }> {
  try {
    const user = await storage.getUserById(userId);
    const effectiveTenantId = tenantId || user?.tenantId || '';

    const integration = await storage.getUserIntegration(userId);
    if (!integration?.googleCalendarAccessToken) {
      return { created: 0, errors: 0 };
    }

    const systemIntegration = await storage.getSystemIntegration('google_sheets');
    if (!systemIntegration?.googleClientId || !systemIntegration?.googleClientSecret) {
      console.error('[SyncRemindersToCalendar] Missing system integration credentials');
      return { created: 0, errors: 0 };
    }

    let accessToken = integration.googleCalendarAccessToken;
    if (integration.googleCalendarTokenExpiry && integration.googleCalendarTokenExpiry < Date.now()) {
      if (!integration.googleCalendarRefreshToken) {
        return { created: 0, errors: 0 };
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
        return { created: 0, errors: 0 };
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
    const remindersToSync = reminders.filter(r => !r.googleCalendarEventId && !r.isCompleted);

    let created = 0;
    let errors = 0;

    for (const reminder of remindersToSync) {
      try {
        let eventDescription = reminder.description || '';
        if (reminder.storeMetadata) {
          const contactInfo: string[] = [];
          if (reminder.storeMetadata.pocName) contactInfo.push(`Contact: ${reminder.storeMetadata.pocName}`);
          if (reminder.storeMetadata.pocEmail) contactInfo.push(`Email: ${reminder.storeMetadata.pocEmail}`);
          if (reminder.storeMetadata.pocPhone) contactInfo.push(`Phone: ${reminder.storeMetadata.pocPhone}`);
          if (reminder.storeMetadata.storePhone) contactInfo.push(`Store Phone: ${reminder.storeMetadata.storePhone}`);
          if (contactInfo.length > 0) {
            eventDescription = eventDescription
              ? `${eventDescription}\n\n${contactInfo.join('\n')}`
              : contactInfo.join('\n');
          }
        }

        let location = '';
        if (reminder.storeMetadata) {
          const addressParts: string[] = [];
          if (reminder.storeMetadata.address) addressParts.push(reminder.storeMetadata.address);
          if (reminder.storeMetadata.city) addressParts.push(reminder.storeMetadata.city);
          if (reminder.storeMetadata.state) addressParts.push(reminder.storeMetadata.state);
          location = addressParts.join(', ');
        }

        const startDateTime = `${reminder.scheduledDate}T${reminder.scheduledTime}:00`;

        const [hours, minutes] = reminder.scheduledTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + 30;
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;
        const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

        let endDate = reminder.scheduledDate;
        if (totalMinutes >= 1440) {
          const [year, month, day] = reminder.scheduledDate.split('-').map(Number);
          const nextDayMs = Date.UTC(year, month - 1, day + 1);
          const nextDay = new Date(nextDayMs);
          endDate = nextDay.toISOString().split('T')[0];
        }
        const endDateTime = `${endDate}T${endTime}:00`;

        const event = {
          summary: reminder.title,
          description: eventDescription,
          location: location || undefined,
          start: {
            dateTime: startDateTime,
            timeZone: reminder.timezone,
          },
          end: {
            dateTime: endDateTime,
            timeZone: reminder.timezone,
          },
        };

        const createdEvent = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: event,
        });

        if (createdEvent.data.id) {
          await storage.updateReminder(reminder.id, effectiveTenantId, {
            googleCalendarEventId: createdEvent.data.id
          });
          created++;
        }
      } catch (error: any) {
        errors++;
        console.error(`[SyncRemindersToCalendar] Error creating calendar event for reminder ${reminder.id}: ${error.message}`);
      }
    }

    if (created > 0) {
      eventGateway.emit('calendar:eventChanged', {
        userId,
        created,
        errors,
        timestamp: new Date().toISOString(),
      });
    }

    return { created, errors };
  } catch (error: any) {
    console.error(`[SyncRemindersToCalendar] Unexpected error: ${error.message}`);
    return { created: 0, errors: 0 };
  }
}
