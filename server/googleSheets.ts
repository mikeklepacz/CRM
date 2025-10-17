import { google } from 'googleapis';
import { storage } from './storage';

async function getAccessToken(userId: string) {
  const integration = await storage.getUserIntegration(userId);
  
  if (!integration?.googleAccessToken || !integration?.googleRefreshToken) {
    throw new Error('Google OAuth not configured. Please connect Google Sheets in Settings.');
  }

  // Check if token is expired (with 5-minute buffer)
  const now = Date.now();
  const expiryTime = integration.googleTokenExpiry || 0;
  const isExpired = expiryTime <= now + (5 * 60 * 1000);

  if (isExpired && integration.googleRefreshToken && integration.googleClientId && integration.googleClientSecret) {
    // Refresh the token (no redirect URI needed for refresh)
    const oauth2Client = new google.auth.OAuth2(
      integration.googleClientId,
      integration.googleClientSecret
    );

    oauth2Client.setCredentials({
      refresh_token: integration.googleRefreshToken
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update tokens in database
      await storage.updateUserIntegration(userId, {
        googleAccessToken: credentials.access_token!,
        googleTokenExpiry: credentials.expiry_date || (Date.now() + 3600000)
      });

      console.log('Successfully refreshed Google access token for user:', userId);
      return credentials.access_token!;
    } catch (error) {
      console.error('Failed to refresh Google access token:', error);
      throw new Error('Failed to refresh Google access token. Please reconnect Google Sheets in Settings.');
    }
  }

  return integration.googleAccessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGoogleSheetClient(userId: string) {
  const accessToken = await getAccessToken(userId);

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}

// Read data from Google Sheet
export async function readSheetData(userId: string, spreadsheetId: string, range: string) {
  const sheets = await getUncachableGoogleSheetClient(userId);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return response.data.values || [];
}

// Write data to Google Sheet
export async function writeSheetData(userId: string, spreadsheetId: string, range: string, values: any[][]) {
  const sheets = await getUncachableGoogleSheetClient(userId);
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

// Append data to Google Sheet
export async function appendSheetData(userId: string, spreadsheetId: string, range: string, values: any[][]) {
  const sheets = await getUncachableGoogleSheetClient(userId);
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

// Get spreadsheet metadata (sheet names, etc.)
export async function getSpreadsheetInfo(userId: string, spreadsheetId: string) {
  const sheets = await getUncachableGoogleSheetClient(userId);
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
  });
  return response.data;
}

// List user's spreadsheets
export async function listSpreadsheets(userId: string) {
  const accessToken = await getAccessToken(userId);
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

// Parse sheet data into objects based on headers
export function parseSheetDataToObjects(rows: any[][], uniqueIdentifierColumn: string) {
  if (rows.length === 0) return [];
  
  const headers = rows[0];
  const uniqueIdIndex = headers.findIndex((h: string) => h.toLowerCase() === uniqueIdentifierColumn.toLowerCase());
  
  if (uniqueIdIndex === -1) {
    throw new Error(`Column "${uniqueIdentifierColumn}" not found in sheet headers`);
  }

  const data: Array<{ uniqueId: string; rowIndex: number; data: Record<string, any> }> = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: Record<string, any> = {};
    
    headers.forEach((header: string, index: number) => {
      obj[header] = row[index] || '';
    });

    const uniqueId = row[uniqueIdIndex];
    if (uniqueId) {
      data.push({
        uniqueId,
        rowIndex: i + 1, // 1-indexed for Google Sheets
        data: obj,
      });
    }
  }

  return data;
}

// Convert objects back to sheet rows
export function convertObjectsToSheetRows(headers: string[], objects: Array<Record<string, any>>) {
  const rows: any[][] = [];
  
  objects.forEach(obj => {
    const row: any[] = [];
    headers.forEach(header => {
      row.push(obj[header] || '');
    });
    rows.push(row);
  });

  return rows;
}
