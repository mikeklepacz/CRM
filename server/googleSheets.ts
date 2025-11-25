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

      return newAccessToken;
    } catch (error) {
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

// Delete a single row from a sheet (system-wide)
export async function deleteSheetRow(spreadsheetId: string, sheetId: number, rowIndex: number) {
  const sheets = await getSystemGoogleSheetClient();
  const response = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1, // Convert to 0-indexed
            endIndex: rowIndex // Exclusive, so this deletes only the specified row
          }
        }
      }]
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
}

// Sync Commission Tracker data to PostgreSQL clients table
// Uses Column P (updated) for incremental sync, falls back to full sync if no lastSyncedAt
export async function syncCommissionTrackerToPostgres(trackerSheetId: string) {
  const sheet = await storage.getGoogleSheetById(trackerSheetId);
  if (!sheet || sheet.sheetPurpose !== 'commissions') {
    throw new Error('Invalid Commission Tracker sheet');
  }

  
  // Read all Commission Tracker data
  const range = `${sheet.sheetName}!A:P`; // Include columns up to P (updated timestamp)
  const rows = await readSheetData(sheet.spreadsheetId, range);
  
  if (rows.length === 0) {
    return { synced: 0, skipped: 0 };
  }

  const headers = rows[0].map((h: string) => h.toLowerCase());
  const linkIndex = headers.findIndex((h: string) => h === 'link');
  const agentNameIndex = headers.findIndex((h: string) => h === 'agent name');
  const amountIndex = headers.findIndex((h: string) => h === 'amount');
  const updatedIndex = 14; // Column P (0-indexed = 14)

  if (linkIndex === -1 || agentNameIndex === -1) {
    throw new Error('Required columns (Link, Agent Name) not found in Commission Tracker');
  }

  const lastSyncedAt = sheet.lastSyncedAt ? new Date(sheet.lastSyncedAt) : null;

  let synced = 0;
  let skipped = 0;

  // Track which clients have changes
  const changedLinks = new Set<string>();

  // First pass: identify which links have changed rows
  if (lastSyncedAt) {
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const link = row[linkIndex]?.toString().trim();
      const updatedStr = row[updatedIndex]?.toString().trim();
      
      if (!link) continue;
      
      const updatedAt = updatedStr ? new Date(updatedStr) : null;
      
      // If any row for this link was updated since last sync, recalculate this client's totals
      if (updatedAt && updatedAt > lastSyncedAt) {
        changedLinks.add(link);
      }
    }
    
    if (changedLinks.size === 0) {
      return { synced: 0, skipped: rows.length - 1 };
    }
    
  }

  // Second pass: calculate COMPLETE totals for changed clients (from ALL their rows)
  const clientData: Map<string, { agentName: string; totalCommission: number; lastUpdated: Date | null }> = new Map();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const link = row[linkIndex]?.toString().trim();
    const agentName = row[agentNameIndex]?.toString().trim();
    const amountStr = row[amountIndex]?.toString().trim();
    const updatedStr = row[updatedIndex]?.toString().trim();

    if (!link || !agentName) continue;

    // For incremental sync: only process links that have changes (or all links if full sync)
    if (lastSyncedAt && !changedLinks.has(link)) {
      skipped++;
      continue;
    }

    // Parse commission amount and timestamp
    const amount = amountStr ? parseFloat(amountStr.replace(/[^0-9.-]+/g, '')) : 0;
    const updatedAt = updatedStr ? new Date(updatedStr) : null;

    if (!clientData.has(link)) {
      clientData.set(link, { agentName, totalCommission: 0, lastUpdated: updatedAt });
    }

    const data = clientData.get(link)!;
    data.totalCommission += amount;
    if (updatedAt && (!data.lastUpdated || updatedAt > data.lastUpdated)) {
      data.lastUpdated = updatedAt;
    }
  }

  // Upsert clients in PostgreSQL
  for (const [link, data] of Array.from(clientData.entries())) {
    try {
      // Find or create client by link
      let client = await storage.findClientByUniqueKey('Link', link);

      if (client) {
        // Update existing client
        await storage.updateClient(client.id, {
          commissionTotal: data.totalCommission.toString(),
          lastSyncedAt: new Date(),
        });
      } else {
        // Create new client (this shouldn't happen often, but handle it)
        await storage.createClient({
          data: { Link: link },
          uniqueIdentifier: link,
          googleSheetId: trackerSheetId,
          commissionTotal: data.totalCommission.toString(),
          totalSales: '0',
          lastSyncedAt: new Date(),
        });
      }
      synced++;
    } catch (error: any) {
    }
  }

  // Update last synced timestamp on the sheet record
  await storage.updateGoogleSheetLastSync(trackerSheetId);

  return { synced, skipped };
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

      return credentials.access_token!;
    } catch (error) {
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

/**
 * Merge store data from source to target, then update target in Store Database
 * Returns the merged store data
 */
export async function mergeAndUpdateStore(
  targetLink: string,
  mergedData: Record<string, any>
) {
  const sheets = await getSystemGoogleSheetClient();
  const storeSheet = await storage.getGoogleSheetByPurpose('Store Database');
  
  if (!storeSheet) {
    throw new Error('Store Database sheet ID not configured');
  }

  // Read all data with headers
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: storeSheet.spreadsheetId,
    range: storeSheet.sheetName,
  });

  const rows = response.data.values || [];
  if (rows.length === 0) {
    throw new Error('Store Database is empty');
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Find the row with matching Link
  const linkIndex = headers.findIndex((h: string) => h === 'Link');
  if (linkIndex === -1) {
    throw new Error('Link column not found in Store Database');
  }

  const targetRowIndex = dataRows.findIndex((row: any[]) => row[linkIndex] === targetLink);
  if (targetRowIndex === -1) {
    throw new Error('Store not found');
  }

  // Build updated row using header-based mapping
  const filteredHeaders = headers.filter((h: string) => h && h.trim() !== '');
  const updatedRow = filteredHeaders.map((header: string) => {
    return mergedData[header] !== undefined ? mergedData[header] : '';
  });

  // Update the specific row
  const rowNumber = targetRowIndex + 2; // +1 for header, +1 for 1-indexed
  await sheets.spreadsheets.values.update({
    spreadsheetId: storeSheet.spreadsheetId,
    range: `${storeSheet.sheetName}!A${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [updatedRow],
    },
  });

  return mergedData;
}

/**
 * Delete a store from Store Database by Link value
 * Uses the Google Sheets API to delete the entire row
 */
export async function deleteStoreFromSheet(link: string) {
  const sheets = await getSystemGoogleSheetClient();
  const storeSheet = await storage.getGoogleSheetByPurpose('Store Database');
  
  if (!storeSheet) {
    throw new Error('Store Database sheet ID not configured');
  }

  // Read all data to find the row
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: storeSheet.spreadsheetId,
    range: storeSheet.sheetName,
  });

  const rows = response.data.values || [];
  if (rows.length === 0) {
    throw new Error('Store Database is empty');
  }

  const headers = rows[0];
  const linkIndex = headers.findIndex((h: string) => h === 'Link');
  if (linkIndex === -1) {
    throw new Error('Link column not found');
  }

  const dataRows = rows.slice(1);
  const rowIndex = dataRows.findIndex((row: any[]) => row[linkIndex] === link);
  
  if (rowIndex === -1) {
    throw new Error('Store not found');
  }

  // Get the numeric sheet ID (gid) by looking up the sheet metadata
  const spreadsheetInfo = await getSpreadsheetInfo(storeSheet.spreadsheetId);
  const targetSheet = spreadsheetInfo.sheets?.find(
    (s: any) => s.properties?.title === storeSheet.sheetName
  );
  
  if (!targetSheet || targetSheet.properties?.sheetId === undefined) {
    throw new Error(`Sheet "${storeSheet.sheetName}" not found in spreadsheet`);
  }

  // Delete the row using batchUpdate with DeleteDimensionRequest
  const rowNumber = rowIndex + 1; // +1 for header row
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: storeSheet.spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: targetSheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowNumber,
            endIndex: rowNumber + 1,
          }
        }
      }]
    }
  });
}

/**
 * Parse Google Sheets row data into objects with unique identifiers
 * @param rows - Raw rows from Google Sheets (first row is headers)
 * @param uniqueIdentifierColumn - Column name to use as unique identifier
 * @returns Array of parsed objects with uniqueId, rowIndex, and data
 */
export function parseSheetDataToObjects(rows: any[][], uniqueIdentifierColumn: string) {
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((h: string) => h?.toString().trim() || '');
  const uniqueIdIndex = headers.findIndex((h: string) => h === uniqueIdentifierColumn);

  if (uniqueIdIndex === -1) {
    throw new Error(`Unique identifier column "${uniqueIdentifierColumn}" not found in sheet headers`);
  }

  const parsed = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const uniqueId = row[uniqueIdIndex]?.toString().trim();

    if (!uniqueId) {
      continue; // Skip rows without a unique identifier
    }

    const data: Record<string, any> = {};
    headers.forEach((header: string, index: number) => {
      if (header) {
        data[header] = row[index] !== undefined ? row[index] : '';
      }
    });

    parsed.push({
      uniqueId,
      rowIndex: i + 1, // 1-indexed row number (accounting for header)
      data
    });
  }

  return parsed;
}

/**
 * Convert objects back to Google Sheets row format
 * @param headers - Array of column headers
 * @param objects - Array of data objects to convert
 * @returns Array of rows (each row is an array of values)
 */
export function convertObjectsToSheetRows(headers: string[], objects: Array<Record<string, any>>) {
  return objects.map(obj => {
    return headers.map(header => {
      return obj[header] !== undefined ? obj[header] : '';
    });
  });
}

/**
 * Update all Commission Tracker rows that reference oldLink to use newLink instead
 */
export async function updateCommissionTrackerLinks(oldLink: string, newLink: string) {
  const sheets = await getSystemGoogleSheetClient();
  const trackerSheet = await storage.getGoogleSheetByPurpose('commissions');
  
  if (!trackerSheet) {
    throw new Error('Commission Tracker sheet ID not configured');
  }

  // Read all Commission Tracker data
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: trackerSheet.spreadsheetId,
    range: trackerSheet.sheetName,
  });

  const rows = response.data.values || [];
  if (rows.length === 0) {
    return; // Empty tracker, nothing to update
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);
  
  const linkIndex = headers.findIndex((h: string) => h === 'Link');
  if (linkIndex === -1) {
    throw new Error('Link column not found in Commission Tracker');
  }

  // Find all rows with oldLink and update them
  const updatedRows: Array<{ range: string; values: any[][] }> = [];
  
  dataRows.forEach((row: any[], index: number) => {
    if (row[linkIndex] === oldLink) {
      const updatedRow = [...row];
      updatedRow[linkIndex] = newLink;
      
      const rowNumber = index + 2; // +1 for header, +1 for 1-indexed
      updatedRows.push({
        range: `${trackerSheet.sheetName}!A${rowNumber}`,
        values: [updatedRow],
      });
    }
  });

  // Batch update all rows
  if (updatedRows.length > 0) {
    await batchUpdateSheetData(trackerSheet.spreadsheetId, updatedRows);
  }
}
