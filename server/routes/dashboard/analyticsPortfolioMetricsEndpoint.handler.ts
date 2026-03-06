import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import { buildSheetRange } from "../../services/sheets/a1Range";
import { listStoreDatabaseSheets } from "../../services/sheets/storeDatabaseResolver";
import { normalizeLink } from "../../../shared/linkUtils";

export function buildAnalyticsPortfolioMetricsEndpointHandler() {
  return async (req: any, res: any) => {
    try {
      if (!req.user) {
          return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { agentIds } = req.query;
      // Get current user details for agent filtering
      const currentUser = await storage.getUserById(userId);
      if (!currentUser) {
          return res.status(404).json({ message: 'User not found' });
      }
      // SECURITY: Determine which agents' data to show
      let allowedAgentNames: string[] = [];
      const isAgent = currentUser.role === 'agent';
      if (isAgent) {
          // SECURITY: Agents can ONLY see their own data - ignore any agentIds parameter
          const currentAgentName = currentUser.agentName || `${currentUser.firstName} ${currentUser.lastName}`.trim();
          allowedAgentNames = [currentAgentName];
      }
      else {
          // Admin: Use agentIds from query params or default to current user
          const requestedAgentIds = agentIds
              ? (Array.isArray(agentIds) ? agentIds : [agentIds])
              : [userId];
          // Fetch user details for requested agent IDs to get their names
          const agentUsers = await Promise.all(requestedAgentIds.map((id) => storage.getUserById(id as string)));
          allowedAgentNames = agentUsers
              .filter(Boolean)
              .map((user) => user!.agentName || `${user!.firstName} ${user!.lastName}`.trim());
      }
      // Get both sheets
      const sheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);
      const trackerSheet = sheets.find((s) => s.sheetPurpose === 'commissions');
      const storeSheets = await listStoreDatabaseSheets(req.user.tenantId);
      if (!trackerSheet || storeSheets.length === 0) {
          return res.json({
              totalClients: 0,
              activeClients: 0,
              avgRevenuePerClient: '0.00',
              repeatOrderRate: '0.0',
          });
      }
      // Read Store Database to get total clients for this agent
      let totalClients = 0;
      const countedStoreLinks = new Set<string>();
      if (isAgent) {
          // For agents, count only stores assigned to them
          for (const storeSheet of storeSheets) {
              const storeRange = buildSheetRange(storeSheet.sheetName, "A:Z");
              const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);
              if (storeRows.length > 1) {
                  const storeHeaders = storeRows[0];
                  let storeAgentIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'agent'); // Check for 'agent' column
                  if (storeAgentIndex === -1) {
                      // Fallback to 'agent name' if 'agent' not found
                      storeAgentIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'agent name');
                  }
                  const linkIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'link');
                  if (storeAgentIndex !== -1) {
                      for (const row of storeRows.slice(1)) {
                          const rowAgent = row[storeAgentIndex] || '';
                          const rowAgentNormalized = rowAgent.toLowerCase().trim();
                          const isAllowed = allowedAgentNames.some((name) => name.toLowerCase().trim() === rowAgentNormalized);
                          if (!isAllowed) continue;
                          const link = linkIndex !== -1 ? row[linkIndex] || "" : "";
                          const dedupeKey = link ? normalizeLink(String(link)) : `${storeSheet.id}:${countedStoreLinks.size}`;
                          if (!countedStoreLinks.has(dedupeKey)) {
                              countedStoreLinks.add(dedupeKey);
                              totalClients++;
                          }
                      }
                  }
              }
          }
      }
      else {
          // Admin: Filter by agentIds parameter
          if (allowedAgentNames.length > 0) {
              for (const storeSheet of storeSheets) {
                  const storeRange = buildSheetRange(storeSheet.sheetName, "A:Z");
                  const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);
                  if (storeRows.length > 1) {
                      const storeHeaders = storeRows[0];
                      let storeAgentIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'agent'); // Check for 'agent' column
                      if (storeAgentIndex === -1) {
                          // Fallback to 'agent name' if 'agent' not found
                          storeAgentIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'agent name');
                      }
                      const linkIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'link');
                      if (storeAgentIndex !== -1) {
                          for (const row of storeRows.slice(1)) {
                              const rowAgent = row[storeAgentIndex] || '';
                              const rowAgentNormalized = rowAgent.toLowerCase().trim();
                              const isAllowed = allowedAgentNames.some((name) => name.toLowerCase().trim() === rowAgentNormalized);
                              if (!isAllowed) continue;
                              const link = linkIndex !== -1 ? row[linkIndex] || "" : "";
                              const dedupeKey = link ? normalizeLink(String(link)) : `${storeSheet.id}:${countedStoreLinks.size}`;
                              if (!countedStoreLinks.has(dedupeKey)) {
                                  countedStoreLinks.add(dedupeKey);
                                  totalClients++;
                              }
                          }
                      }
                  }
              }
          }
          else {
              // No filter, count all stores
              for (const storeSheet of storeSheets) {
                  const storeRange = buildSheetRange(storeSheet.sheetName, "A:Z");
                  const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);
                  if (storeRows.length <= 1) continue;
                  const storeHeaders = storeRows[0];
                  const linkIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'link');
                  for (const row of storeRows.slice(1)) {
                      const link = linkIndex !== -1 ? row[linkIndex] || "" : "";
                      const dedupeKey = link ? normalizeLink(String(link)) : `${storeSheet.id}:${countedStoreLinks.size}`;
                      if (!countedStoreLinks.has(dedupeKey)) {
                          countedStoreLinks.add(dedupeKey);
                          totalClients++;
                      }
                  }
              }
          }
      }
      // Read Commission Tracker to calculate active clients and repeat order rate
      const trackerRange = buildSheetRange(trackerSheet.sheetName, "A:G");
      const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);
      if (trackerRows.length <= 1) {
          return res.json({
              totalClients,
              activeClients: 0,
              avgRevenuePerClient: '0.00',
              repeatOrderRate: '0.0',
          });
      }
      // Parse headers
      const headers = trackerRows[0];
      const linkIndex = headers.findIndex((h: string) => h.toLowerCase() === 'link');
      const amountIndex = headers.findIndex((h: string) => h.toLowerCase() === 'amount');
      const dateIndex = headers.findIndex((h: string) => h.toLowerCase() === 'date');
      const agentIndex = headers.findIndex((h: string) => h.toLowerCase() === 'agent name');
      // Track transactions per store
      const storeTransactions: {
          [link: string]: {
              count: number;
              totalAmount: number;
              lastTransactionDate: Date | null;
          };
      } = {};
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      for (let i = 1; i < trackerRows.length; i++) {
          const row = trackerRows[i];
          const link = row[linkIndex] || '';
          const amountStr = row[amountIndex] || '0';
          const dateStr = row[dateIndex] || '';
          const rowAgent = row[agentIndex] || '';
          // SECURITY: Filter by allowed agent names
          if (allowedAgentNames.length > 0) {
              // If Agent column doesn't exist, agents see ZERO data
              if (agentIndex === -1) {
                  continue;
              }
              const rowAgentNormalized = rowAgent.toLowerCase().trim();
              const isAllowed = allowedAgentNames.some((name) => name.toLowerCase().trim() === rowAgentNormalized);
              if (!isAllowed) {
                  continue;
              }
          }
          const amount = parseFloat(String(amountStr).replace(/[^0-9.-]/g, '')) || 0;
          if (!link || amount === 0)
              continue;
          if (!storeTransactions[link]) {
              storeTransactions[link] = { count: 0, totalAmount: 0, lastTransactionDate: null };
          }
          storeTransactions[link].count += 1;
          storeTransactions[link].totalAmount += amount;
          // Update last transaction date if this one is more recent
          let transactionDate: Date | null = null;
          if (dateStr) {
              const parsed = new Date(dateStr);
              if (!isNaN(parsed.getTime())) {
                  transactionDate = parsed;
              }
          }
          if (transactionDate &&
              (!storeTransactions[link].lastTransactionDate ||
                  transactionDate > storeTransactions[link].lastTransactionDate)) {
              storeTransactions[link].lastTransactionDate = transactionDate;
          }
      }
      // Calculate metrics
      // Active clients = stores with transactions in the last 30 days
      const activeStores = Object.values(storeTransactions).filter((store) => store.lastTransactionDate && store.lastTransactionDate >= thirtyDaysAgo);
      const activeClients = activeStores.length;
      // Calculate average revenue per client (based on all stores with transactions, not just active)
      const allStoresWithTransactions = Object.values(storeTransactions);
      const totalRevenue = allStoresWithTransactions.reduce((sum, store) => sum + store.totalAmount, 0);
      const avgRevenuePerClient = allStoresWithTransactions.length > 0 ? totalRevenue / allStoresWithTransactions.length : 0;
      // Repeat order rate = percentage of stores (with transactions) that have multiple transactions
      const storesWithMultipleTransactions = allStoresWithTransactions.filter((store) => store.count > 1).length;
      const repeatOrderRate = allStoresWithTransactions.length > 0
          ? (storesWithMultipleTransactions / allStoresWithTransactions.length) * 100
          : 0;
      res.json({
          totalClients,
          activeClients,
          avgRevenuePerClient: avgRevenuePerClient.toFixed(2),
          repeatOrderRate: repeatOrderRate.toFixed(1),
      });
    }
    catch (error: any) {
      console.error('Error fetching portfolio metrics:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch portfolio metrics' });
    }
  };
}
