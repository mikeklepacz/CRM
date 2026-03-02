import { google } from "googleapis";
import { getSystemAccessToken, getSystemGoogleSheetClient } from "./auth";

export async function readSheetData(spreadsheetId: string, range: string) {
  const sheets = await getSystemGoogleSheetClient();
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return response.data.values || [];
}

export async function writeSheetData(spreadsheetId: string, range: string, values: any[][]) {
  const sheets = await getSystemGoogleSheetClient();
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: { values },
  });
  return response.data;
}

export async function appendSheetData(spreadsheetId: string, range: string, values: any[][]) {
  const sheets = await getSystemGoogleSheetClient();
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
  return response.data;
}

export async function getSpreadsheetInfo(spreadsheetId: string) {
  const sheets = await getSystemGoogleSheetClient();
  const response = await sheets.spreadsheets.get({ spreadsheetId });
  return response.data;
}

export async function listSpreadsheets() {
  const accessToken = await getSystemAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: "v3", auth: oauth2Client });
  const response = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.spreadsheet'",
    pageSize: 100,
    fields: "files(id, name, modifiedTime)",
    orderBy: "modifiedTime desc",
  });

  return response.data.files || [];
}

export async function batchGetSheetData(spreadsheetId: string, ranges: string[]) {
  const sheets = await getSystemGoogleSheetClient();
  const response = await sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges });
  return response.data.valueRanges || [];
}

export async function batchUpdateSheetData(spreadsheetId: string, data: Array<{ range: string; values: any[][] }>) {
  const sheets = await getSystemGoogleSheetClient();
  const response = await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: data.map((item) => ({ range: item.range, values: item.values })),
    },
  });
  return response.data;
}

export async function deleteSheetRow(spreadsheetId: string, sheetId: number, rowIndex: number) {
  const sheets = await getSystemGoogleSheetClient();
  const response = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });
  return response.data;
}

export async function writeCommissionTrackerTimestamp(
  spreadsheetId: string,
  sheetName: string,
  rowIndex: number,
  column: "O" | "P",
) {
  const timestamp = new Date().toISOString();
  const cellRange = `${sheetName}!${column}${rowIndex}`;
  await writeSheetData(spreadsheetId, cellRange, [[timestamp]]);
}
