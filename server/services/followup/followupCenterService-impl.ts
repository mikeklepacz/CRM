import { inArray } from "drizzle-orm";
import { clients } from "@shared/schema";
import { normalizeLink } from "../../../shared/linkUtils";
import { db } from "../../db";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import { buildSheetRange } from "../sheets/a1Range";
import { listStoreDatabaseSheets } from "../sheets/storeDatabaseResolver";

interface FollowUpBuckets {
  claimedUntouched: any[];
  interestedGoingCold: any[];
  closedWonReorder: any[];
}

class FollowUpCenterError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function emptyBuckets(): FollowUpBuckets {
  return { claimedUntouched: [], interestedGoingCold: [], closedWonReorder: [] };
}

export function isFollowUpCenterError(error: unknown): error is FollowUpCenterError {
  return error instanceof FollowUpCenterError;
}

export async function getFollowUpCenterDataForUser(requestUser: any): Promise<FollowUpBuckets> {
  const userId = requestUser.isPasswordAuth ? requestUser.id : requestUser.claims.sub;
  const user = await storage.getUser(userId);

  if (!user) {
    throw new FollowUpCenterError(404, "User not found");
  }

  console.log("[FOLLOW-UP] 👤 User:", user.email, "Role:", user.role);

  let allowedAgentNames: string[] = [];
  const isAgent = user.role === "agent";

  if (isAgent) {
    const currentAgentName = user.agentName || `${user.firstName} ${user.lastName}`.trim();
    allowedAgentNames = [currentAgentName];
    console.log("[FOLLOW-UP] 🔐 Agent mode - filtering by:", currentAgentName);
  } else {
    console.log("[FOLLOW-UP] 🔐 Admin mode - no filtering");
    allowedAgentNames = [];
  }

  const trackerSheet = await storage.getGoogleSheetByPurpose("commissions", requestUser.tenantId);
  if (!trackerSheet) {
    console.log("[FOLLOW-UP] ❌ No Commission Tracker sheet found");
    return emptyBuckets();
  }

  const trackerRange = buildSheetRange(trackerSheet.sheetName, "A:ZZ");
  const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

  if (trackerRows.length <= 1) {
    console.log("[FOLLOW-UP] ❌ Commission Tracker is empty");
    return emptyBuckets();
  }

  const headers = trackerRows[0];
  const linkIndex = headers.findIndex((h: string) => h.toLowerCase() === "link");
  const agentNameIndex = headers.findIndex((h: string) => h.toLowerCase() === "agent name");
  const statusIndex = headers.findIndex((h: string) => h.toLowerCase() === "status");
  const totalIndex = headers.findIndex((h: string) => h.toLowerCase() === "total");
  const dateIndex = headers.findIndex((h: string) => h.toLowerCase() === "date");
  const parentLinkIndex = headers.findIndex((h: string) => h.toLowerCase() === "parent link");

  console.log("[FOLLOW-UP] 📋 Column indices:", { linkIndex, agentNameIndex, statusIndex, totalIndex, dateIndex });

  const tenantId = requestUser.tenantId;
  const allCallHistory = await storage.getAllCallHistory(tenantId);
  console.log("[FOLLOW-UP] 📞 Found", allCallHistory.length, "total calls in history");

  const callMetrics: Map<string, { callCount: number; lastCallDate: Date | null; daysSinceCall: number }> = new Map();
  for (const call of allCallHistory) {
    if (!call.storeLink) continue;

    const existing = callMetrics.get(call.storeLink);
    const callDate = new Date(call.calledAt as any);
    const newCallCount = (existing?.callCount || 0) + 1;
    const mostRecentDate = !existing?.lastCallDate || callDate > existing.lastCallDate ? callDate : existing.lastCallDate;
    const daysSince = Math.floor((new Date().getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));

    callMetrics.set(call.storeLink, {
      callCount: newCallCount,
      lastCallDate: mostRecentDate,
      daysSinceCall: daysSince
    });
  }

  console.log("[FOLLOW-UP] 📊 Call metrics built for", callMetrics.size, "unique stores");

  const storesByLink: Map<string, any> = new Map();
  for (let i = 1; i < trackerRows.length; i++) {
    const row = trackerRows[i];
    const link = row[linkIndex]?.toString().trim();
    const rowAgent = row[agentNameIndex]?.toString().trim();
    const status = row[statusIndex]?.toString().trim() || "";
    const totalStr = row[totalIndex]?.toString() || "0";
    const dateStr = row[dateIndex]?.toString() || "";
    const parentLink = parentLinkIndex >= 0 ? row[parentLinkIndex]?.toString().trim() : "";

    if (!link) continue;
    if (parentLink) continue;

    if (allowedAgentNames.length > 0) {
      if (agentNameIndex === -1) continue;
      const rowAgentNormalized = rowAgent ? rowAgent.toLowerCase().trim() : "";
      const isAllowed = allowedAgentNames.some((name) => name.toLowerCase().trim() === rowAgentNormalized);
      if (!isAllowed) continue;
    }

    const total = parseFloat(String(totalStr).replace(/[^0-9.-]/g, "")) || 0;

    let orderDate: Date | null = null;
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        orderDate = parsed;
      }
    }

    const metrics = callMetrics.get(link) || { callCount: 0, lastCallDate: null, daysSinceCall: 0 };

    const storeObj: any = {
      Link: link,
      "Agent Name": rowAgent,
      Status: status,
      _total: total,
      _orderDate: orderDate,
      _callCount: metrics.callCount,
      _lastCallDate: metrics.lastCallDate,
      _daysSinceCall: metrics.daysSinceCall,
    };

    headers.forEach((header: string, idx: number) => {
      if (row[idx] !== undefined && row[idx] !== null && row[idx] !== "") {
        storeObj[header] = row[idx];
      }
    });

    storesByLink.set(link, storeObj);
  }

  console.log("[FOLLOW-UP] 🏪 Processed", storesByLink.size, "unique stores from tracker");

  const storeSheets = await listStoreDatabaseSheets(requestUser.tenantId);
  if (storeSheets.length > 0) {
    const storeDataMap = new Map<string, any>();

    for (const storeSheet of storeSheets) {
      const storeRows = await googleSheets.readSheetData(
        storeSheet.spreadsheetId,
        buildSheetRange(storeSheet.sheetName, "A:ZZ")
      );

      if (storeRows.length <= 1) {
        continue;
      }

      const storeHeaders = storeRows[0];
      const storeLinkIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === "link");
      if (storeLinkIndex === -1) {
        continue;
      }

      for (let i = 1; i < storeRows.length; i++) {
        const row = storeRows[i];
        const storeLink = row[storeLinkIndex]?.toString().trim();

        if (storeLink) {
          const normalized = normalizeLink(storeLink);
          if (storeDataMap.has(normalized)) {
            continue;
          }

          const storeData: any = {};
          storeHeaders.forEach((header: string, idx: number) => {
            if (row[idx] !== undefined && row[idx] !== null && row[idx] !== "") {
              storeData[header] = row[idx];
            }
          });
          storeDataMap.set(normalized, storeData);
        }
      }
    }

    for (const [link, store] of storesByLink.entries()) {
      const normalizedLink = normalizeLink(link);
      const storeData = storeDataMap.get(normalizedLink);
      if (storeData) {
        Object.assign(store, storeData);
      }
    }

    console.log("[FOLLOW-UP] ✨ Enriched stores with Store Database data");
  }

  const stores = Array.from(storesByLink.values());
  console.log("[FOLLOW-UP] 🏪 Processed", stores.length, "stores");

  const storeLinks = Array.from(storesByLink.keys());
  const clientsData = storeLinks.length > 0
    ? await db
        .select({
          link: clients.uniqueIdentifier,
          claimDate: clients.claimDate,
          createdAt: clients.createdAt,
        })
        .from(clients)
        .where(inArray(clients.uniqueIdentifier, storeLinks))
    : [];

  const claimDateMap = new Map<string, Date>();
  for (const client of clientsData) {
    const dateToUse = client.claimDate || client.createdAt;
    if (dateToUse) {
      claimDateMap.set(client.link as string, dateToUse);
    }
  }

  console.log("[FOLLOW-UP] 📅 Found claim dates for", claimDateMap.size, "stores");

  const now = new Date();

  const claimedUntouched = stores
    .filter((s) => {
      const status = (s.Status || "").toString().toLowerCase();
      return (status === "claimed" || status === "contacted") && s._callCount === 0;
    })
    .map((s) => {
      const claimDate = claimDateMap.get(s.Link);
      const fallbackDate = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
      const effectiveClaimDate = claimDate || fallbackDate;
      const daysSinceContact = Math.floor((now.getTime() - effectiveClaimDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: s.Link,
        data: s,
        claimDate: (claimDate || fallbackDate).toISOString(),
        lastContactDate: null,
        firstOrderDate: null,
        lastOrderDate: null,
        daysSinceContact
      };
    });

  const interestedGoingCold = stores
    .filter((s) => {
      const status = (s.Status || "").toString().toLowerCase();
      const isWarmStatus = ["interested", "sample sent", "follow up", "warm"].includes(status);
      return isWarmStatus && s._callCount > 0 && s._total === 0 && s._daysSinceCall > 7;
    })
    .map((s) => ({
      id: s.Link,
      data: s,
      claimDate: claimDateMap.get(s.Link)?.toISOString() || null,
      lastContactDate: s._callDate?.toISOString() || null,
      firstOrderDate: null,
      lastOrderDate: null,
      daysSinceContact: s._daysSinceCall
    }));

  const closedWonReorder = stores
    .filter((s) => {
      if (s._total === 0) return false;
      if (!s._orderDate) return false;
      const daysSinceOrder = Math.floor((now.getTime() - s._orderDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceOrder > 30;
    })
    .map((s) => ({
      id: s.Link,
      data: s,
      claimDate: claimDateMap.get(s.Link)?.toISOString() || null,
      lastContactDate: s._callDate?.toISOString() || null,
      firstOrderDate: s._orderDate?.toISOString() || null,
      lastOrderDate: s._orderDate?.toISOString() || null,
      daysSinceOrder: s._orderDate ? Math.floor((now.getTime() - s._orderDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
    }));

  console.log("[FOLLOW-UP] ✅ Results:", {
    claimedUntouched: claimedUntouched.length,
    interestedGoingCold: interestedGoingCold.length,
    closedWonReorder: closedWonReorder.length
  });

  return { claimedUntouched, interestedGoingCold, closedWonReorder };
}
