import { buildSheetRange } from "../sheets/a1Range";
import { listStoreDatabaseSheetsByPriority } from "../sheets/storeDatabaseResolver";

type Deps = {
  computeHash: (input: any) => string;
  eventGateway: { emit: (event: string, payload: any, options?: any) => void };
  getCached: <T>(cacheKey: string, dataHash: string) => T | null;
  googleSheets: {
    readSheetData: (spreadsheetId: string, range: string) => Promise<any[][]>;
    writeSheetData: (spreadsheetId: string, range: string, values: any[][]) => Promise<any>;
  };
  normalizeLink: (link: string) => string;
  setCache: (cacheKey: string, dataHash: string, value: any) => void;
  storage: any;
};

const CLAIM_EXPIRATION_DAYS = 14;
const OTHER_STATUS_EXPIRATION_DAYS = 60;
const EXPIRABLE_STATUSES = ["claimed", "emailed", "contacted", "interested", "sample sent"];

function parseExpirationDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === "") return null;
  try {
    const cleaned = dateStr.trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(cleaned)) {
      const parts = cleaned.split("/");
      const month = parseInt(parts[0], 10) - 1;
      const day = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      return new Date(year, month, day);
    }

    const parsed = new Date(cleaned);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

function columnLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

type AggregatedClient = {
  link: string;
  totalCommission: number;
  totalSales: number;
  lastOrderDate: Date | null;
  status: string;
  transactionId: string;
  orderId: string;
};

function aggregateTrackerRows(
  trackerRows: any[][],
  indices: {
    linkIndex: number;
    agentNameIndex: number;
    amountIndex: number;
    totalIndex: number;
    dateIndex: number;
    statusIndex: number;
    transactionIdIndex: number;
    orderIdIndex: number;
    parentLinkIndex: number;
  },
  allowedAgentNames: string[]
): AggregatedClient[] {
  const clientMap = new Map<string, AggregatedClient>();

  for (let i = 1; i < trackerRows.length; i++) {
    const row = trackerRows[i];
    const link = row[indices.linkIndex]?.toString().trim();
    if (!link) continue;

    const parentLink = indices.parentLinkIndex >= 0 ? row[indices.parentLinkIndex]?.toString().trim() : "";
    if (parentLink) continue;

    if (allowedAgentNames.length > 0) {
      if (indices.agentNameIndex === -1) continue;
      const rowAgent = row[indices.agentNameIndex]?.toString().trim().toLowerCase() || "";
      const isAllowed = allowedAgentNames.some((name) => name.toLowerCase().trim() === rowAgent);
      if (!isAllowed) continue;
    }

    const amount = parseFloat(String(row[indices.amountIndex] || "0").replace(/[^0-9.-]/g, "")) || 0;
    const total = parseFloat(String(row[indices.totalIndex] || "0").replace(/[^0-9.-]/g, "")) || 0;
    const status = row[indices.statusIndex]?.toString().trim() || "";
    const transactionId = row[indices.transactionIdIndex]?.toString().trim() || "";
    const orderId = row[indices.orderIdIndex]?.toString().trim() || "";

    let orderDate: Date | null = null;
    const dateStr = row[indices.dateIndex]?.toString() || "";
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) orderDate = parsed;
    }

    if (!clientMap.has(link)) {
      clientMap.set(link, {
        link,
        totalCommission: 0,
        totalSales: 0,
        lastOrderDate: orderDate,
        status: status || "7 – Warm",
        transactionId: transactionId || "",
        orderId: orderId || "",
      });
    }

    const client = clientMap.get(link)!;
    client.totalCommission += amount;
    client.totalSales += total;
    if (orderDate && (!client.lastOrderDate || orderDate > client.lastOrderDate)) {
      client.lastOrderDate = orderDate;
    }
    if (status) client.status = status;
    if (transactionId) client.transactionId = transactionId;
    if (orderId) client.orderId = orderId;
  }

  return Array.from(clientMap.values());
}

export function createGetMyClientsHandler(deps: Deps) {
  const { computeHash, eventGateway, getCached, googleSheets, normalizeLink, setCache, storage } = deps;

  return async (req: any, res: any) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const currentUser = await storage.getUserById(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const allowedAgentNames =
        currentUser.role === "agent"
          ? [currentUser.agentName || `${currentUser.firstName} ${currentUser.lastName}`.trim()]
          : [];

      const tenantId = (req.user as any).tenantId;
      const requestedProjectId = typeof req.query?.projectId === "string" ? req.query.projectId : undefined;
      const trackerSheet = await storage.getGoogleSheetByPurpose("commissions", tenantId);
      if (!trackerSheet) return res.json([]);

      const trackerRange = buildSheetRange(trackerSheet.sheetName, "A:ZZ");
      const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

      const prioritizedStoreSheets = await listStoreDatabaseSheetsByPriority({
        tenantId,
        projectId: requestedProjectId,
        preferProjectMatch: true,
      });
      const storeSheetsToLoad = requestedProjectId ? prioritizedStoreSheets.slice(0, 1) : prioritizedStoreSheets;
      const storeSheetData: Array<{ sheetId: string; sheetName: string; rows: any[][] }> = [];
      for (const sheet of storeSheetsToLoad) {
        const rows = await googleSheets.readSheetData(sheet.spreadsheetId, buildSheetRange(sheet.sheetName, "A:S"));
        storeSheetData.push({
          sheetId: sheet.id,
          sheetName: sheet.sheetName,
          rows,
        });
      }

      const cacheKey = `my-clients:${userId}:${allowedAgentNames.join(",")}:${requestedProjectId || "all"}`;
      const dataHash = computeHash({ trackerRows, storeSheetData, allowedAgentNames, requestedProjectId });
      const cached = getCached<any[]>(cacheKey, dataHash);
      if (cached) return res.json(cached);
      if (trackerRows.length <= 1) return res.json([]);

      const headers = trackerRows[0];
      const linkIndex = headers.findIndex((h: string) => h.toLowerCase() === "link");
      const agentNameIndex = headers.findIndex((h: string) => h.toLowerCase() === "agent name");
      const amountIndex = headers.findIndex((h: string) => h.toLowerCase() === "amount");
      const totalIndex = headers.findIndex((h: string) => h.toLowerCase() === "total");
      const dateIndex = headers.findIndex((h: string) => h.toLowerCase() === "date");
      const statusIndex = headers.findIndex((h: string) => h.toLowerCase() === "status");
      const transactionIdIndex = headers.findIndex((h: string) => h.toLowerCase() === "transaction id");
      const orderIdIndex = headers.findIndex(
        (h: string) => h.toLowerCase() === "order number" || h.toLowerCase() === "order id"
      );
      const parentLinkIndex = headers.findIndex((h: string) => h.toLowerCase() === "parent link");
      const timeIndex = headers.findIndex((h: string) => h.toLowerCase() === "time");

      const expiredRows: Array<{ rowIndex: number; status: string; daysSince: number }> = [];
      const now = new Date();
      if (statusIndex !== -1 && timeIndex !== -1 && agentNameIndex !== -1) {
        for (let i = 1; i < trackerRows.length; i++) {
          const row = trackerRows[i];
          const status = (row[statusIndex]?.toString().trim() || "").toLowerCase();
          const timeStr = row[timeIndex]?.toString() || "";
          const agentName = row[agentNameIndex]?.toString().trim() || "";

          if (!EXPIRABLE_STATUSES.includes(status) || !agentName || !timeStr) continue;
          const claimDate = parseExpirationDate(timeStr);
          if (!claimDate) continue;

          const daysSince = Math.floor((now.getTime() - claimDate.getTime()) / (1000 * 60 * 60 * 24));
          const threshold = status === "claimed" ? CLAIM_EXPIRATION_DAYS : OTHER_STATUS_EXPIRATION_DAYS;
          if (daysSince > threshold) {
            expiredRows.push({ rowIndex: i + 1, status, daysSince });
          }
        }
      }

      if (expiredRows.length > 0) {
        const agentNameCol = columnLetter(agentNameIndex);
        const statusCol = columnLetter(statusIndex);
        const timeCol = timeIndex !== -1 ? columnLetter(timeIndex) : null;

        for (const row of expiredRows) {
          try {
            await googleSheets.writeSheetData(
              trackerSheet.spreadsheetId,
              buildSheetRange(trackerSheet.sheetName, `${agentNameCol}${row.rowIndex}`),
              [[""]]
            );
            await googleSheets.writeSheetData(
              trackerSheet.spreadsheetId,
              buildSheetRange(trackerSheet.sheetName, `${statusCol}${row.rowIndex}`),
              [[""]]
            );
            if (timeCol) {
              await googleSheets.writeSheetData(
                trackerSheet.spreadsheetId,
                buildSheetRange(trackerSheet.sheetName, `${timeCol}${row.rowIndex}`),
                [[""]]
              );
            }
            console.log(`[ClaimExpiration] Expired claim cleared at row ${row.rowIndex} (${row.status}, ${row.daysSince} days old)`);
          } catch (err: any) {
            console.error(`[ClaimExpiration] Failed to clear row ${row.rowIndex}:`, err.message);
          }
        }

        const updatedRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);
        trackerRows.length = 0;
        trackerRows.push(...updatedRows);
      }

      const aggregated = aggregateTrackerRows(
        trackerRows,
        {
          linkIndex,
          agentNameIndex,
          amountIndex,
          totalIndex,
          dateIndex,
          statusIndex,
          transactionIdIndex,
          orderIdIndex,
          parentLinkIndex,
        },
        allowedAgentNames
      );

      let enrichedClients = aggregated.map((client) => ({
        id: client.link,
        uniqueIdentifier: client.link,
        data: { Link: client.link, Name: "", Contact: "" },
        assignedAgent: currentUser.id,
        claimDate: null,
        totalSales: client.totalSales.toFixed(2),
        commissionTotal: client.totalCommission.toFixed(2),
        category: null as string | null,
        status: client.status,
        lastOrderDate: client.lastOrderDate,
        transactionId: client.transactionId,
        orderId: client.orderId,
        lastSyncedAt: new Date(),
      }));

      if (storeSheetData.some((entry) => entry.rows.length > 1)) {
        const storeMap = new Map<string, { name: string; category: string; contact: string }>();

        for (const storeEntry of storeSheetData) {
          const storeRows = storeEntry.rows;
          if (!storeRows || storeRows.length <= 1) {
            continue;
          }

          const storeHeaders = storeRows[0];
          const storeLinkIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === "link");
          const storeCategoryIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === "category");
          const pocNameIndex = storeHeaders.findIndex(
            (h: string) => h.toLowerCase() === "point of contact" || h.toLowerCase() === "poc"
          );
          if (storeLinkIndex === -1) {
            continue;
          }

          for (let i = 1; i < storeRows.length; i++) {
            const row = storeRows[i];
            const storeLink = row[storeLinkIndex]?.toString().trim();
            if (!storeLink) continue;
            const dba = row[13]?.toString().trim() || "";
            const name = row[0]?.toString().trim() || "";
            const storeCategory = storeCategoryIndex !== -1 ? row[storeCategoryIndex]?.toString().trim() || "" : "";
            const pocName = pocNameIndex !== -1 ? row[pocNameIndex]?.toString().trim() || "" : "";
            const normalizedStoreLink = normalizeLink(storeLink);
            if (!storeMap.has(normalizedStoreLink)) {
              storeMap.set(normalizedStoreLink, {
                name: name || dba || "Unknown",
                category: storeCategory,
                contact: pocName,
              });
            }
          }
        }

        enrichedClients = enrichedClients.map((client) => {
          const storeData = storeMap.get(normalizeLink(client.data.Link));
          if (!storeData) return client;
          return {
            ...client,
            data: { ...client.data, Name: storeData.name, Contact: storeData.contact },
            category: storeData.category,
          };
        });
      }

      setCache(cacheKey, dataHash, enrichedClients);
      eventGateway.emit(
        "clients:updated",
        { clientCount: enrichedClients.length, hash: dataHash.substring(0, 8) },
        { userId }
      );

      res.json(enrichedClients);
    } catch (error: any) {
      console.error("Error fetching agent clients:", error);
      res.status(500).json({ message: error.message || "Failed to fetch clients" });
    }
  };
}
