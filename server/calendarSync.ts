import { google } from 'googleapis';
import { storage } from './storage';

/**
 * Syncs reminders to Google Calendar for a specific user
 * Creates calendar events for any reminders that don't have a calendarEventId
 */
export async function syncRemindersToCalendar(userId: string): Promise<{ created: number; errors: number }> {
  try {
    // Get user's calendar integration
    const integration = await storage.getUserIntegration(userId);
    if (!integration?.googleCalendarAccessToken) {
      console.log(`[CalendarSync] User ${userId} doesn't have Google Calendar connected`);
      return { created: 0, errors: 0 };
    }

    // Get system OAuth credentials
    const systemIntegration = await storage.getSystemIntegration('google_sheets');
    if (!systemIntegration?.googleClientId || !systemIntegration?.googleClientSecret) {
      console.error('[CalendarSync] System OAuth not configured');
      return { created: 0, errors: 0 };
    }

    // Check if token needs refresh
    let accessToken = integration.googleCalendarAccessToken;
    if (integration.googleCalendarTokenExpiry && integration.googleCalendarTokenExpiry < Date.now()) {
      console.log('[CalendarSync] Refreshing expired token...');
      if (!integration.googleCalendarRefreshToken) {
        console.error('[CalendarSync] No refresh token available');
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
        console.error('[CalendarSync] Token refresh failed');
        return { created: 0, errors: 0 };
      }

      const tokens = await tokenResponse.json();
      accessToken = tokens.access_token;
      await storage.updateUserIntegration(userId, {
        googleCalendarAccessToken: tokens.access_token,
        googleCalendarTokenExpiry: Date.now() + (tokens.expires_in * 1000)
      });
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      systemIntegration.googleClientId,
      systemIntegration.googleClientSecret
    );
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get all reminders for this user without calendar events
    const reminders = await storage.getRemindersByUser(userId);
    const remindersToSync = reminders.filter(r => !r.googleCalendarEventId && !r.isCompleted);

    console.log(`[CalendarSync] Found ${remindersToSync.length} reminders to sync for user ${userId}`);

    let created = 0;
    let errors = 0;

    for (const reminder of remindersToSync) {
      try {
        // Build event description
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

        // Build location
        let location = '';
        if (reminder.storeMetadata) {
          const addressParts: string[] = [];
          if (reminder.storeMetadata.address) addressParts.push(reminder.storeMetadata.address);
          if (reminder.storeMetadata.city) addressParts.push(reminder.storeMetadata.city);
          if (reminder.storeMetadata.state) addressParts.push(reminder.storeMetadata.state);
          location = addressParts.join(', ');
        }

        // Build timezone-aware datetime string (YYYY-MM-DDTHH:MM:SS format)
        const startDateTime = `${reminder.scheduledDate}T${reminder.scheduledTime}:00`;
        
        // Calculate end time by adding 30 minutes, handling midnight rollover
        const [hours, minutes] = reminder.scheduledTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + 30;
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;
        const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
        
        // Check if we crossed midnight (need to advance date)
        let endDate = reminder.scheduledDate;
        if (totalMinutes >= 1440) { // 24 * 60 = 1440 minutes in a day
          // Use Date.UTC to avoid server timezone issues
          const [year, month, day] = reminder.scheduledDate.split('-').map(Number);
          const nextDayMs = Date.UTC(year, month - 1, day + 1);
          const nextDay = new Date(nextDayMs);
          endDate = nextDay.toISOString().split('T')[0]; // YYYY-MM-DD
        }
        const endDateTime = `${endDate}T${endTime}:00`;

        // Create calendar event with timezone-aware datetime
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

        // Update reminder with calendar event ID
        if (createdEvent.data.id) {
          await storage.updateReminder(reminder.id, {
            googleCalendarEventId: createdEvent.data.id
          });
          created++;
          console.log(`[CalendarSync] Created event ${createdEvent.data.id} for reminder ${reminder.id}`);
        }
      } catch (error: any) {
        console.error(`[CalendarSync] Failed to create event for reminder ${reminder.id}:`, error.message);
        errors++;
      }
    }

    console.log(`[CalendarSync] Sync complete: ${created} created, ${errors} errors`);
    return { created, errors };
  } catch (error: any) {
    console.error('[CalendarSync] Sync failed:', error.message);
    return { created: 0, errors: 0 };
  }
}

/**
 * Sets up Google Calendar watch channel for push notifications
 * Automatically called when user connects Google Calendar
 */
export async function setupCalendarWatch(userId: string): Promise<boolean> {
  try {
    const integration = await storage.getUserIntegration(userId);
    if (!integration?.googleCalendarAccessToken) {
      return false;
    }

    const systemIntegration = await storage.getSystemIntegration('google_sheets');
    if (!systemIntegration?.googleClientId || !systemIntegration?.googleClientSecret) {
      console.error('[CalendarWatch] System OAuth not configured');
      return false;
    }

    // Refresh token if needed
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

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      systemIntegration.googleClientId,
      systemIntegration.googleClientSecret
    );
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Generate unique channel ID
    const channelId = `calendar-watch-${userId}-${Date.now()}`;
    
    // Get webhook URL - must match the actual endpoint path
    const webhookUrl = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/webhooks/google-calendar`
      : `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/webhooks/google-calendar`;

    // Set up watch channel
    const response = await calendar.events.watch({
      calendarId: 'primary',
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        token: userId, // Pass userId as token for identification
      }
    });

    if (response.data.id && response.data.resourceId && response.data.expiration) {
      await storage.updateUserIntegration(userId, {
        googleCalendarWebhookChannelId: response.data.id,
        googleCalendarWebhookResourceId: response.data.resourceId,
        googleCalendarWebhookExpiry: parseInt(response.data.expiration)
      });

      console.log(`[CalendarWatch] Set up watch channel for user ${userId}, expires ${new Date(parseInt(response.data.expiration))}`);
      return true;
    }

    return false;
  } catch (error: any) {
    console.error('[CalendarWatch] Failed to setup watch:', error.message);
    return false;
  }
}

/**
 * Renews Google Calendar watch channel if close to expiry
 */
export async function renewCalendarWatchIfNeeded(userId: string): Promise<boolean> {
  try {
    const integration = await storage.getUserIntegration(userId);
    if (!integration?.googleCalendarWebhookChannelId || !integration.googleCalendarWebhookExpiry) {
      return false;
    }

    // Check if expiring within 24 hours
    const expiryTime = integration.googleCalendarWebhookExpiry;
    const now = Date.now();
    const hoursUntilExpiry = (expiryTime - now) / (1000 * 60 * 60);

    if (hoursUntilExpiry > 24) {
      return false; // Still valid
    }

    console.log(`[CalendarWatch] Renewing watch channel for user ${userId} (expires in ${hoursUntilExpiry.toFixed(1)} hours)`);
    return await setupCalendarWatch(userId);
  } catch (error: any) {
    console.error('[CalendarWatch] Failed to renew watch:', error.message);
    return false;
  }
}
