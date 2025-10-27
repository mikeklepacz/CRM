import { google } from 'googleapis';
import { storage } from './storage';

// In-memory cache for system access token
interface TokenCache {
  accessToken: string;
  expiryTime: number;
}

let systemTokenCache: TokenCache | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getSystemAccessToken() {
  const integration = await storage.getSystemIntegration('google_sheets');
  
  if (!integration?.googleAccessToken || !integration?.googleRefreshToken) {
    throw new Error('Google Sheets not configured. Admin must connect Google Sheets in Admin Dashboard.');
  }

  // Check if cached token is still valid (with 5-minute buffer)
  const now = Date.now();
  if (systemTokenCache && systemTokenCache.expiryTime > now + CACHE_TTL) {
    return systemTokenCache.accessToken;
  }

  // Check if stored token is expired
  const expiryTime = integration.googleTokenExpiry || 0;
  const isExpired = expiryTime <= now + CACHE_TTL;

  if (isExpired && integration.googleRefreshToken && integration.googleClientId && integration.googleClientSecret) {
    // Refresh the token
    const oauth2Client = new google.auth.OAuth2(
      integration.googleClientId,
      integration.googleClientSecret
    );

    oauth2Client.setCredentials({
      refresh_token: integration.googleRefreshToken
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      const newAccessToken = credentials.access_token!;
      const newExpiryTime = credentials.expiry_date || (Date.now() + 3600000);

      // Update database
      await storage.updateSystemIntegration('google_sheets', {
        googleAccessToken: newAccessToken,
        googleTokenExpiry: newExpiryTime
      });

      // Update cache
      systemTokenCache = {
        accessToken: newAccessToken,
        expiryTime: newExpiryTime
      };

      console.log('✅ Successfully refreshed system Google Sheets access token');
      return newAccessToken;
    } catch (error) {
      console.error('❌ Failed to refresh Google Sheets access token:', error);
      throw new Error('Failed to refresh Google Sheets access token. Admin must reconnect in Admin Dashboard.');
    }
  }

  // Update cache with current token
  systemTokenCache = {
    accessToken: integration.googleAccessToken,
    expiryTime: integration.googleTokenExpiry || (Date.now() + 3600000)
  };

  return integration.googleAccessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getSystemGoogleSheetClient() {
  const accessToken = await getSystemAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}

// Check if system Google Sheets integration is configured
export async function isSystemGoogleSheetsConfigured(): Promise<boolean> {
  const integration = await storage.getSystemIntegration('google_sheets');
  return !!(integration?.googleAccessToken && integration?.googleRefreshToken);
}

// Get system integration status (for admin UI)
export async function getSystemGoogleSheetsStatus() {
  const integration = await storage.getSystemIntegration('google_sheets');
  
  if (!integration?.googleAccessToken) {
    return {
      connected: false,
      connectedByUserId: null,
      connectedByEmail: null,
      connectedAt: null
    };
  }

  return {
    connected: true,
    connectedByUserId: integration.connectedByUserId,
    connectedByEmail: integration.connectedByEmail,
    connectedAt: integration.createdAt
  };
}

// Clear cache (useful for testing or manual invalidation)
export function clearSystemTokenCache() {
  systemTokenCache = null;
}

// Read data from Google Sheet (system-wide)
export async function readSheetData(spreadsheetId: string, range: string) {
  const sheets = await getSystemGoogleSheetClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return response.data.values || [];
}

// Write data to Google Sheet (system-wide)
export async function writeSheetData(spreadsheetId: string, range: string, values: any[][]) {
  const sheets = await getSystemGoogleSheetClient();
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: {
      values,
    },
  });
  return response.data;
}

// Append data to Google Sheet (system-wide)
export async function appendSheetData(spreadsheetId: string, range: string, values: any[][]) {
  const sheets = await getSystemGoogleSheetClient();
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values,
    },
  });
  return response.data;
}

// Get spreadsheet metadata (sheet names, etc.) (system-wide)
export async function getSpreadsheetInfo(spreadsheetId: string) {
  const sheets = await getSystemGoogleSheetClient();
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
  });
  return response.data;
}

// List spreadsheets (system-wide)
export async function listSpreadsheets() {
  const accessToken = await getSystemAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const response = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.spreadsheet'",
    pageSize: 100,
    fields: 'files(id, name, modifiedTime)',
    orderBy: 'modifiedTime desc',
  });

  return response.data.files || [];
}

// Batch get multiple ranges (system-wide)
export async function batchGetSheetData(spreadsheetId: string, ranges: string[]) {
  const sheets = await getSystemGoogleSheetClient();
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges,
  });
  return response.data.valueRanges || [];
}

// Batch update multiple ranges (system-wide)
export async function batchUpdateSheetData(spreadsheetId: string, data: Array<{ range: string; values: any[][] }>) {
  const sheets = await getSystemGoogleSheetClient();
  const response = await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: data.map(item => ({
        range: item.range,
        values: item.values
      }))
    }
  });
  return response.data;
}

// Write timestamp to Column O (time) or Column P (updated) in Commission Tracker
export async function writeCommissionTrackerTimestamp(
  spreadsheetId: string, 
  sheetName: string, 
  rowIndex: number, 
  column: 'O' | 'P'
) {
  const timestamp = new Date().toISOString();
  const cellRange = `${sheetName}!${column}${rowIndex}`;
  await writeSheetData(spreadsheetId, cellRange, [[timestamp]]);
  console.log(`✅ Wrote timestamp to ${cellRange}: ${timestamp}`);
}

// --- Legacy per-user functions (for Gmail/Calendar that remain per-user) ---

async function getUserAccessToken(userId: string) {
  const integration = await storage.getUserIntegration(userId);
  
  if (!integration?.googleAccessToken || !integration?.googleRefreshToken) {
    throw new Error('Google OAuth not configured. Please connect Google in Settings.');
  }

  // Check if token is expired (with 5-minute buffer)
  const now = Date.now();
  const expiryTime = integration.googleTokenExpiry || 0;
  const isExpired = expiryTime <= now + (5 * 60 * 1000);

  if (isExpired && integration.googleRefreshToken && integration.googleClientId && integration.googleClientSecret) {
    // Refresh the token
    const oauth2Client = new google.auth.OAuth2(
      integration.googleClientId,
      integration.googleClientSecret
    );

    oauth2Client.setCredentials({
      refresh_token: integration.googleRefreshToken
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      const newExpiryTime = credentials.expiry_date || (Date.now() + 3600000);
      
      // Update tokens in database (both Gmail and Calendar fields)
      await storage.updateUserIntegration(userId, {
        googleAccessToken: credentials.access_token!,
        googleTokenExpiry: newExpiryTime,
        googleCalendarAccessToken: credentials.access_token!,
        googleCalendarTokenExpiry: newExpiryTime
      });

      console.log('✅ Successfully refreshed user Google access token for user:', userId);
      return credentials.access_token!;
    } catch (error) {
      console.error('❌ Failed to refresh user Google access token:', error);
      throw new Error('Failed to refresh Google access token. Please reconnect Google in Settings.');
    }
  }

  return integration.googleAccessToken;
}

export async function getUserGoogleClient(userId: string) {
  const accessToken = await getUserAccessToken(userId);

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return {
    gmail: google.gmail({ version: 'v1', auth: oauth2Client }),
    calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
    oauth2Client
  };
}
