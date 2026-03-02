import { google } from "googleapis";
import { storage } from "../storage";

interface TokenCache {
  accessToken: string;
  expiryTime: number;
}

let systemTokenCache: TokenCache | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function getSystemAccessToken() {
  const integration = (await storage.getSystemIntegration("google_sheets")) as any;

  if (!integration?.googleAccessToken || !integration?.googleRefreshToken) {
    throw new Error("Google Sheets not configured. Admin must connect Google Sheets in Admin Dashboard.");
  }

  const now = Date.now();
  if (systemTokenCache && systemTokenCache.expiryTime > now + CACHE_TTL) {
    return systemTokenCache.accessToken;
  }

  const expiryTime = integration.googleTokenExpiry || 0;
  const isExpired = expiryTime <= now + CACHE_TTL;

  if (isExpired && integration.googleRefreshToken && integration.googleClientId && integration.googleClientSecret) {
    const oauth2Client = new google.auth.OAuth2(integration.googleClientId, integration.googleClientSecret);

    oauth2Client.setCredentials({
      refresh_token: integration.googleRefreshToken,
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      const newAccessToken = credentials.access_token!;
      const newExpiryTime = credentials.expiry_date || Date.now() + 3600000;

      await storage.updateSystemIntegration("google_sheets", {
        googleAccessToken: newAccessToken,
        googleTokenExpiry: newExpiryTime,
      });

      systemTokenCache = {
        accessToken: newAccessToken,
        expiryTime: newExpiryTime,
      };

      return newAccessToken;
    } catch (error) {
      console.error("❌ Failed to refresh Google Sheets access token:", error);
      throw new Error("Failed to refresh Google Sheets access token. Admin must reconnect in Admin Dashboard.");
    }
  }

  systemTokenCache = {
    accessToken: integration.googleAccessToken,
    expiryTime: integration.googleTokenExpiry || Date.now() + 3600000,
  };

  return integration.googleAccessToken;
}

export async function getSystemGoogleSheetClient() {
  const accessToken = await getSystemAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.sheets({ version: "v4", auth: oauth2Client });
}

export async function isSystemGoogleSheetsConfigured(): Promise<boolean> {
  const integration = await storage.getSystemIntegration("google_sheets");
  return !!(integration?.googleAccessToken && integration?.googleRefreshToken);
}

export async function getSystemGoogleSheetsStatus() {
  const integration = (await storage.getSystemIntegration("google_sheets")) as any;

  if (!integration?.googleAccessToken) {
    return {
      connected: false,
      connectedByUserId: null,
      connectedByEmail: null,
      connectedAt: null,
    };
  }

  return {
    connected: true,
    connectedByUserId: integration.connectedByUserId,
    connectedByEmail: integration.connectedByEmail,
    connectedAt: integration.createdAt,
  };
}

export function clearSystemTokenCache() {
  systemTokenCache = null;
}

async function getUserAccessToken(userId: string) {
  const integration = (await storage.getUserIntegration(userId)) as any;

  if (!integration?.googleAccessToken || !integration?.googleRefreshToken) {
    throw new Error("Google OAuth not configured. Please connect Google in Settings.");
  }

  const now = Date.now();
  const expiryTime = integration.googleTokenExpiry || 0;
  const isExpired = expiryTime <= now + 5 * 60 * 1000;

  if (isExpired && integration.googleRefreshToken && integration.googleClientId && integration.googleClientSecret) {
    const oauth2Client = new google.auth.OAuth2(integration.googleClientId, integration.googleClientSecret);

    oauth2Client.setCredentials({
      refresh_token: integration.googleRefreshToken,
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      const newExpiryTime = credentials.expiry_date || Date.now() + 3600000;

      await (storage as any).updateUserIntegration(userId, {
        googleAccessToken: credentials.access_token!,
        googleTokenExpiry: newExpiryTime,
        googleCalendarAccessToken: credentials.access_token!,
        googleCalendarTokenExpiry: newExpiryTime,
      });

      return credentials.access_token!;
    } catch (error) {
      console.error("❌ Failed to refresh user Google access token:", error);
      throw new Error("Failed to refresh Google access token. Please reconnect Google in Settings.");
    }
  }

  return integration.googleAccessToken;
}

export async function getUserGoogleClient(userId: string) {
  const accessToken = await getUserAccessToken(userId);

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return {
    gmail: google.gmail({ version: "v1", auth: oauth2Client }),
    calendar: google.calendar({ version: "v3", auth: oauth2Client }),
    oauth2Client,
  };
}
