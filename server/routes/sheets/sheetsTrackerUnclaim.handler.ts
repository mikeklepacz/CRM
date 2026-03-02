import { eq, sql } from "drizzle-orm";
import { commissions, orders } from "@shared/schema";
import { normalizeLink } from "../../../shared/linkUtils";
import { db } from "../../db";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

export async function handleStoreCommissionsCount(req: any, res: any): Promise<any> {
  try {
    const { encodedLink } = req.params;
    const storeLink = decodeURIComponent(encodedLink);

    const commissionRecords = await db
      .select({ count: sql<number>`count(*)` })
      .from(commissions)
      .innerJoin(orders, eq(commissions.orderId, orders.id))
      .where(eq((orders as any).storeLink, storeLink));

    const count = Number(commissionRecords[0]?.count || 0);
    res.json({ count });
  } catch (error: any) {
    console.error("[Commission Count] Error:", error);
    res.status(500).json({ message: error.message || "Failed to count commissions" });
  }
}

export async function handleSheetsTrackerUnclaim(req: any, res: any): Promise<any> {
  try {
    const { link } = req.body;
    if (!link) {
      return res.status(400).json({ message: "Link is required" });
    }

    const sheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);
    const trackerSheet = sheets.find((s) => s.sheetPurpose === "commissions");

    if (!trackerSheet) {
      return res.status(404).json({ message: "Commission Tracker sheet not found" });
    }

    const { spreadsheetId, sheetName } = trackerSheet;
    const rows = await googleSheets.readSheetData(spreadsheetId, `${sheetName}!A:ZZ`);
    if (rows.length === 0) {
      return res.status(400).json({ message: "Tracker sheet is empty" });
    }

    const headers = rows[0];
    const linkIndex = headers.findIndex((h) => h.toLowerCase() === "link");
    if (linkIndex === -1) {
      return res.status(400).json({ message: "Link column not found" });
    }

    const normalizedInputLink = normalizeLink(link.trim());
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      const rowLink = rows[i][linkIndex];
      const normalizedRowLink = rowLink ? normalizeLink(rowLink.toString().trim()) : "";
      if (rowLink && normalizedRowLink === normalizedInputLink) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      return res.status(404).json({ message: "Tracker row not found for this store" });
    }

    const spreadsheetInfo = await googleSheets.getSpreadsheetInfo(spreadsheetId);
    const targetSheet = spreadsheetInfo.sheets?.find((s) => s.properties?.title === sheetName);
    if (!targetSheet || !targetSheet.properties?.sheetId) {
      return res.status(404).json({ message: "Sheet not found in spreadsheet" });
    }

    const sheetsClient = await googleSheets.getSystemGoogleSheetClient();
    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: targetSheet.properties.sheetId,
                dimension: "ROWS",
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    });

    res.json({ message: "Store unclaimed successfully", rowIndex });
  } catch (error: any) {
    console.error("[Unclaim] Error:", error);
    res.status(500).json({ message: error.message || "Failed to unclaim store" });
  }
}

function headerIndex(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.findIndex((h) => h.toLowerCase().trim() === candidate.toLowerCase().trim());
    if (idx !== -1) return idx;
  }
  return -1;
}

function hasTrackerContextData(headers: string[], row: any[]): boolean {
  const contextColumns = [
    ["notes"],
    ["point of contact"],
    ["poc email"],
    ["poc phone"],
    ["status"],
    ["follow-up date", "followup"],
    ["next action"],
  ];

  return contextColumns.some((names) => {
    const idx = headerIndex(headers, names);
    if (idx === -1) return false;
    const value = row[idx];
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
}

export async function handleSheetsTrackerRelease(req: any, res: any, deps: any): Promise<any> {
  try {
    const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
    const { link } = req.body;
    if (!link) {
      return res.status(400).json({ message: "Link is required" });
    }

    const sheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);
    const trackerSheet = sheets.find((s) => s.sheetPurpose === "commissions");
    if (!trackerSheet) {
      return res.status(404).json({ message: "Commission Tracker sheet not found" });
    }

    const { spreadsheetId, sheetName } = trackerSheet;
    const rows = await googleSheets.readSheetData(spreadsheetId, `${sheetName}!A:ZZ`);
    if (rows.length === 0) {
      return res.status(400).json({ message: "Tracker sheet is empty" });
    }

    const headers = rows[0];
    const linkIndex = headerIndex(headers, ["link"]);
    if (linkIndex === -1) {
      return res.status(400).json({ message: "Link column not found" });
    }

    const normalizedInputLink = normalizeLink(link.trim());
    let rowIndex = -1;
    let rowData: any[] | null = null;
    for (let i = 1; i < rows.length; i++) {
      const rowLink = rows[i][linkIndex];
      const normalizedRowLink = rowLink ? normalizeLink(rowLink.toString().trim()) : "";
      if (rowLink && normalizedRowLink === normalizedInputLink) {
        rowIndex = i + 1;
        rowData = rows[i];
        break;
      }
    }

    if (rowIndex === -1 || !rowData) {
      return res.status(404).json({ message: "Tracker row not found for this store" });
    }

    const commissionRecords = await db
      .select({ count: sql<number>`count(*)` })
      .from(commissions)
      .innerJoin(orders, eq(commissions.orderId, orders.id))
      .where(eq((orders as any).storeLink, link));
    const commissionCount = Number(commissionRecords[0]?.count || 0);

    const preserveRow = commissionCount > 0 || hasTrackerContextData(headers, rowData);

    if (preserveRow) {
      const agentNameIndex = headerIndex(headers, ["agent name"]);
      const agentIndex = headerIndex(headers, ["agent"]);
      const targetIndexes = [agentNameIndex, agentIndex].filter((i) => i !== -1);

      if (targetIndexes.length === 0) {
        return res.status(400).json({ message: 'Neither "Agent Name" nor "Agent" column found in tracker sheet' });
      }

      for (const idx of targetIndexes) {
        const columnLetter = String.fromCharCode(65 + idx);
        const cellRange = `${sheetName}!${columnLetter}${rowIndex}`;
        await googleSheets.writeSheetData(spreadsheetId, cellRange, [[""]]);
      }

      if (deps?.clearUserCache) deps.clearUserCache(userId);
      return res.json({
        message: "Listing released by clearing Agent Name",
        action: "cleared-agent-name",
        rowIndex,
        commissionCount,
      });
    }

    const spreadsheetInfo = await googleSheets.getSpreadsheetInfo(spreadsheetId);
    const targetSheet = spreadsheetInfo.sheets?.find((s) => s.properties?.title === sheetName);
    if (!targetSheet || !targetSheet.properties?.sheetId) {
      return res.status(404).json({ message: "Sheet not found in spreadsheet" });
    }

    const sheetsClient = await googleSheets.getSystemGoogleSheetClient();
    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: targetSheet.properties.sheetId,
                dimension: "ROWS",
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    });

    if (deps?.clearUserCache) deps.clearUserCache(userId);
    return res.json({
      message: "Listing released by deleting tracker row",
      action: "deleted-row",
      rowIndex,
      commissionCount,
    });
  } catch (error: any) {
    console.error("[Release] Error:", error);
    return res.status(500).json({ message: error.message || "Failed to release listing" });
  }
}
