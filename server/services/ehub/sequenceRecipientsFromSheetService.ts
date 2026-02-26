import { google } from "googleapis";
import { insertSequenceRecipientSchema } from "@shared/schema";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import { resolveTimezone } from "../timezoneHours";
import {
  SequenceRecipientImportError,
  emailRegex,
  ensureImportableSequence,
  normalizeState,
  persistImportedRecipients,
} from "./sequenceRecipientsImportShared";

type ImportFromSheetInput = {
  sequenceId: string;
  tenantId: string;
  userId: string;
  sheetId: string;
};

async function readSheetDataForUser(userId: string, spreadsheetId: string, range: string): Promise<any[][]> {
  const { oauth2Client } = await googleSheets.getUserGoogleClient(userId);
  const sheetsClient = google.sheets({ version: "v4", auth: oauth2Client });
  const response = await sheetsClient.spreadsheets.values.get({ spreadsheetId, range });
  return response.data.values || [];
}

export async function importSequenceRecipientsFromSheet(input: ImportFromSheetInput) {
  const sequence = await ensureImportableSequence(input.sequenceId, input.tenantId);

  const userIntegration = await storage.getUserIntegration(input.userId);
  if (!userIntegration?.googleAccessToken) {
    throw new SequenceRecipientImportError(400, "Google Sheets not connected");
  }

  const rows = await readSheetDataForUser(input.userId, input.sheetId, "Store Database!A:Z");

  if (!rows.length) {
    throw new SequenceRecipientImportError(400, "No data found in sheet");
  }

  const headers = rows[0].map((h: any) => h?.toString().toLowerCase().trim() || "");
  const nameIndex = headers.findIndex((h: string) => h === "name");
  const emailIndex = headers.findIndex((h: string) => h === "email");
  const linkIndex = headers.findIndex((h: string) => h === "link");
  const hoursIndex = headers.findIndex((h: string) => h === "hours");
  const salesSummaryIndex = headers.findIndex((h: string) => h === "sales summary");
  const stateIndex = headers.findIndex((h: string) => h === "state");

  if (nameIndex === -1 || emailIndex === -1) {
    throw new SequenceRecipientImportError(400, "Required columns (Name, Email) not found in sheet");
  }

  const recipients: any[] = [];
  const seenEmails = new Set<string>();
  const skippedRows: string[] = [];

  for (const row of rows.slice(1)) {
    const rawName = row[nameIndex]?.toString().trim();
    const rawEmail = row[emailIndex]?.toString().trim();
    const rawLink = linkIndex !== -1 ? row[linkIndex]?.toString().trim() : null;
    const rawHours = hoursIndex !== -1 ? row[hoursIndex]?.toString().trim() : null;
    const rawSalesSummary = salesSummaryIndex !== -1 ? row[salesSummaryIndex]?.toString().trim() : null;
    const rawState = stateIndex !== -1 ? row[stateIndex]?.toString().trim() : null;

    if (!rawName || !rawEmail) {
      continue;
    }

    const email = rawEmail.toLowerCase();
    if (!emailRegex.test(email) || seenEmails.has(email)) {
      if (!emailRegex.test(email)) {
        skippedRows.push(`Invalid email: ${email}`);
      }
      continue;
    }

    const existing = await storage.findRecipientByEmail(input.sequenceId, email);
    if (existing) {
      continue;
    }

    let timezone = "America/New_York";
    if (rawState) {
      const normalizedState = normalizeState(rawState);
      if (normalizedState) {
        timezone = resolveTimezone(normalizedState);
      }
    }

    try {
      insertSequenceRecipientSchema.parse({
        sequenceId: input.sequenceId,
        email,
        name: rawName,
        link: rawLink || "",
        salesSummary: rawSalesSummary || "",
        businessHours: rawHours || "",
        state: rawState || null,
        timezone,
        status: "pending",
      });

      seenEmails.add(email);
      recipients.push({
        tenantId: input.tenantId,
        sequenceId: input.sequenceId,
        email,
        name: rawName,
        link: rawLink || "",
        salesSummary: rawSalesSummary || "",
        businessHours: rawHours || "",
        state: rawState || null,
        timezone,
        status: "pending",
      });
    } catch {
      skippedRows.push(`Validation failed for ${email}: ${rawName}`);
    }
  }

  if (!recipients.length) {
    return {
      message: "No new recipients to import",
      count: 0,
      skipped: skippedRows.length,
      skippedReasons: skippedRows.slice(0, 10),
    };
  }

  const created = await persistImportedRecipients(input.sequenceId, input.tenantId, sequence, recipients);
  return {
    message: "Recipients imported successfully",
    count: created.length,
    skipped: skippedRows.length,
    skippedReasons: skippedRows.slice(0, 10),
  };
}
