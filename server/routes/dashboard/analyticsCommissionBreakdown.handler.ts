import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

export async function handleAnalyticsCommissionBreakdown(req: any, res: any): Promise<any> {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
    const { agentIds } = req.query;

    const currentUser = await storage.getUserById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    let allowedAgentNames: string[] = [];
    const isAgent = currentUser.role === "agent";

    if (isAgent) {
      const currentAgentName = currentUser.agentName || `${currentUser.firstName} ${currentUser.lastName}`.trim();
      allowedAgentNames = [currentAgentName];
    } else {
      const requestedAgentIds = agentIds
        ? (Array.isArray(agentIds) ? agentIds : [agentIds])
        : [userId];

      const agentUsers = await Promise.all(
        requestedAgentIds.map((id) => storage.getUserById(id as string))
      );

      allowedAgentNames = agentUsers
        .filter(Boolean)
        .map((user) => user!.agentName || `${user!.firstName} ${user!.lastName}`.trim());
    }

    const trackerSheet = await storage.getGoogleSheetByPurpose("commissions", req.user.tenantId);
    if (!trackerSheet) {
      return res.json({
        breakdown: {
          tier25Percent: { clients: 0, earnings: 0 },
          tier10Percent: { clients: 0, earnings: 0 },
        },
      });
    }

    const trackerRange = `${trackerSheet.sheetName}!A:G`;
    const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

    if (trackerRows.length <= 1) {
      return res.json({
        breakdown: {
          tier25Percent: { clients: 0, earnings: 0 },
          tier10Percent: { clients: 0, earnings: 0 },
        },
      });
    }

    const headers = trackerRows[0];
    const linkIndex = headers.findIndex((h: string) => h.toLowerCase() === "link");
    const amountIndex = headers.findIndex((h: string) => h.toLowerCase() === "amount");
    const commissionTypeIndex = headers.findIndex((h: string) => h.toLowerCase() === "commission type");
    const agentIndex = headers.findIndex((h: string) => h.toLowerCase() === "agent name");

    const tier25Stores = new Set<string>();
    const tier10Stores = new Set<string>();
    let tier25Earnings = 0;
    let tier10Earnings = 0;

    for (let i = 1; i < trackerRows.length; i++) {
      const row = trackerRows[i];
      const link = row[linkIndex] || "";
      const amountStr = row[amountIndex] || "0";
      const commissionType = row[commissionTypeIndex] || "";
      const rowAgent = row[agentIndex] || "";

      if (allowedAgentNames.length > 0) {
        if (agentIndex === -1) {
          continue;
        }

        const rowAgentNormalized = rowAgent.toLowerCase().trim();
        const isAllowed = allowedAgentNames.some(
          (name) => name.toLowerCase().trim() === rowAgentNormalized
        );
        if (!isAllowed) {
          continue;
        }
      }

      const amount = parseFloat(String(amountStr).replace(/[^0-9.-]/g, "")) || 0;
      if (amount === 0) continue;

      if (commissionType.includes("25")) {
        tier25Earnings += amount;
        if (link) tier25Stores.add(link);
      } else if (commissionType.includes("10")) {
        tier10Earnings += amount;
        if (link) tier10Stores.add(link);
      }
    }

    res.json({
      breakdown: {
        tier25Percent: {
          clients: tier25Stores.size,
          earnings: tier25Earnings,
        },
        tier10Percent: {
          clients: tier10Stores.size,
          earnings: tier10Earnings,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching commission breakdown:", error);
    res.status(500).json({ message: error.message || "Failed to fetch commission breakdown" });
  }
}
