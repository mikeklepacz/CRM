import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-sheet',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Sheet not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGoogleSheetClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}

// Read data from Google Sheet
export async function readSheetData(spreadsheetId: string, range: string) {
  const sheets = await getUncachableGoogleSheetClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return response.data.values || [];
}

// Write data to Google Sheet
export async function writeSheetData(spreadsheetId: string, range: string, values: any[][]) {
  const sheets = await getUncachableGoogleSheetClient();
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
export async function appendSheetData(spreadsheetId: string, range: string, values: any[][]) {
  const sheets = await getUncachableGoogleSheetClient();
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
export async function getSpreadsheetInfo(spreadsheetId: string) {
  const sheets = await getUncachableGoogleSheetClient();
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
  });
  return response.data;
}

// List user's spreadsheets
export async function listSpreadsheets() {
  const accessToken = await getAccessToken();
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
