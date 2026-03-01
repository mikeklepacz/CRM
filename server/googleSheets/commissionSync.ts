import { storage } from "../storage";
import { readSheetData } from "./sheetCrud";

export async function syncCommissionTrackerToPostgres(trackerSheetId: string, tenantId: string) {
  const sheet = await storage.getGoogleSheetById(trackerSheetId, tenantId);
  if (!sheet || sheet.sheetPurpose !== "commissions") {
    throw new Error("Invalid Commission Tracker sheet");
  }

  const range = `${sheet.sheetName}!A:P`;
  const rows = await readSheetData(sheet.spreadsheetId, range);

  if (rows.length === 0) {
    return { synced: 0, skipped: 0 };
  }

  const headers = rows[0].map((h: string) => h.toLowerCase());
  const linkIndex = headers.findIndex((h: string) => h === "link");
  const agentNameIndex = headers.findIndex((h: string) => h === "agent name");
  const amountIndex = headers.findIndex((h: string) => h === "amount");
  const updatedIndex = 14;

  if (linkIndex === -1 || agentNameIndex === -1) {
    throw new Error("Required columns (Link, Agent Name) not found in Commission Tracker");
  }

  const lastSyncedAt = sheet.lastSyncedAt ? new Date(sheet.lastSyncedAt) : null;

  let synced = 0;
  let skipped = 0;

  const changedLinks = new Set<string>();

  if (lastSyncedAt) {
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const link = row[linkIndex]?.toString().trim();
      const updatedStr = row[updatedIndex]?.toString().trim();

      if (!link) continue;

      const updatedAt = updatedStr ? new Date(updatedStr) : null;
      if (updatedAt && updatedAt > lastSyncedAt) {
        changedLinks.add(link);
      }
    }

    if (changedLinks.size === 0) {
      return { synced: 0, skipped: rows.length - 1 };
    }
  }

  const clientData: Map<string, { agentName: string; totalCommission: number; lastUpdated: Date | null }> = new Map();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const link = row[linkIndex]?.toString().trim();
    const agentName = row[agentNameIndex]?.toString().trim();
    const amountStr = row[amountIndex]?.toString().trim();
    const updatedStr = row[updatedIndex]?.toString().trim();

    if (!link || !agentName) continue;

    if (lastSyncedAt && !changedLinks.has(link)) {
      skipped++;
      continue;
    }

    const amount = amountStr ? parseFloat(amountStr.replace(/[^0-9.-]+/g, "")) : 0;
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

  for (const [link, data] of Array.from(clientData.entries())) {
    try {
      let client = await storage.findClientByUniqueKey("Link", link);

      if (client) {
        await (storage as any).updateClient(client.id, {
          commissionTotal: data.totalCommission.toString(),
          lastSyncedAt: new Date(),
        });
      } else {
        await (storage as any).createClient({
          data: { Link: link },
          uniqueIdentifier: link,
          googleSheetId: trackerSheetId,
          commissionTotal: data.totalCommission.toString(),
          totalSales: "0",
          lastSyncedAt: new Date(),
        });
      }
      synced++;
    } catch (error: any) {
      console.error(`❌ Error syncing client ${link}:`, error.message);
    }
  }

  await storage.updateGoogleSheetLastSync(trackerSheetId);

  return { synced, skipped };
}
