import { google, gmail_v1 } from 'googleapis';
import { storage } from '../storage';

export const GMAIL_ADMIN_USER_ID = process.env.GMAIL_ADMIN_USER_ID || '4df35876-ab89-4860-8656-0440accfea14';

export interface GmailClientResult {
  gmail: gmail_v1.Gmail;
  accessToken: string;
  email: string;
}

export async function getGmailClient(userId: string): Promise<GmailClientResult> {
  const integration = await storage.getUserIntegration(userId);
  if (!integration?.googleCalendarAccessToken) {
    throw new Error('Gmail not connected. Please connect Gmail first.');
  }

  const systemIntegration = await storage.getSystemIntegration('google_sheets');
  if (!systemIntegration?.googleClientId || !systemIntegration?.googleClientSecret) {
    throw new Error('System OAuth not configured');
  }

  let accessToken = integration.googleCalendarAccessToken;
  if (integration.googleCalendarTokenExpiry && integration.googleCalendarTokenExpiry < Date.now()) {
    if (!integration.googleCalendarRefreshToken) {
      throw new Error('Gmail token expired. Please reconnect Gmail.');
    }

    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: systemIntegration.googleClientId,
        client_secret: systemIntegration.googleClientSecret,
        refresh_token: integration.googleCalendarRefreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!refreshResponse.ok) {
      throw new Error('Failed to refresh Gmail token');
    }

    const tokens = await refreshResponse.json();
    accessToken = tokens.access_token;

    await storage.updateUserIntegration(userId, {
      googleCalendarAccessToken: accessToken,
      googleCalendarTokenExpiry: Date.now() + (tokens.expires_in * 1000),
    });
  }

  const oauth2Client = new google.auth.OAuth2(
    systemIntegration.googleClientId,
    systemIntegration.googleClientSecret
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: integration.googleCalendarRefreshToken,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
  return {
    gmail,
    accessToken,
    email: integration.googleCalendarEmail || '',
  };
}

export async function getAdminGmailClient(): Promise<GmailClientResult> {
  return getGmailClient(GMAIL_ADMIN_USER_ID);
}
