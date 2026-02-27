import type { Express } from "express";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

export function registerAnalyticsTopClientsRoutes(app: Express): void {
  app.get('/api/analytics/top-clients', async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { agentIds, limit } = req.query;
      const topLimit = limit ? parseInt(limit as string) : 10;

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
      } else {
        // Admin: Use agentIds from query params or default to current user
        const requestedAgentIds = agentIds
          ? (Array.isArray(agentIds) ? agentIds : [agentIds])
          : [userId];

        // Fetch user details for requested agent IDs to get their names
        const agentUsers = await Promise.all(
          requestedAgentIds.map((id) => storage.getUserById(id as string))
        );

        allowedAgentNames = agentUsers
          .filter(Boolean)
          .map((user) => user!.agentName || `${user!.firstName} ${user!.lastName}`.trim());
      }

      // Get Commission Tracker sheet
      const trackerSheet = await storage.getGoogleSheetByPurpose('commissions', req.user.tenantId);
      if (!trackerSheet) {
        return res.json({ topClients: [] });
      }

      // Read Commission Tracker data
      const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
      const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

      if (trackerRows.length <= 1) {
        return res.json({ topClients: [] });
      }

      // Parse headers to find column indices
      const headers = trackerRows[0];
      const linkIndex = headers.findIndex((h: string) => h.toLowerCase() === 'link');
      const amountIndex = headers.findIndex((h: string) => h.toLowerCase() === 'amount');
      const dateIndex = headers.findIndex((h: string) => h.toLowerCase() === 'date');
      const agentIndex = headers.findIndex((h: string) => h.toLowerCase() === 'agent name');

      // Track metrics per client (by link)
      const clientMetrics: {
        [link: string]: {
          totalCommission: number;
          orderCount: number;
          firstOrderDate: string | null;
          lastOrderDate: string | null;
        };
      } = {};

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
          const isAllowed = allowedAgentNames.some(
            (name) => name.toLowerCase().trim() === rowAgentNormalized
          );
          if (!isAllowed) {
            continue;
          }
        }

        const amount = parseFloat(String(amountStr).replace(/[^0-9.-]/g, '')) || 0;
        if (!link || amount === 0) continue;

        // Initialize client metrics if doesn't exist
        if (!clientMetrics[link]) {
          clientMetrics[link] = {
            totalCommission: 0,
            orderCount: 0,
            firstOrderDate: null,
            lastOrderDate: null,
          };
        }

        // Update metrics
        clientMetrics[link].totalCommission += amount;
        clientMetrics[link].orderCount += 1;

        // Update dates
        if (dateStr) {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            const isoDate = parsed.toISOString();
            if (!clientMetrics[link].firstOrderDate || isoDate < clientMetrics[link].firstOrderDate!) {
              clientMetrics[link].firstOrderDate = isoDate;
            }
            if (!clientMetrics[link].lastOrderDate || isoDate > clientMetrics[link].lastOrderDate!) {
              clientMetrics[link].lastOrderDate = isoDate;
            }
          }
        }
      }

      // Helper function to normalize links for matching
      const normalizeLink = (link: string): string => {
        if (!link) return '';
        return link
          .toLowerCase()
          .trim()
          .replace(/^https?:\/\//, '') // Remove protocol
          .replace(/^www\./, '') // Remove www
          .replace(/\/$/, ''); // Remove trailing slash
      };

      // Get Store Database sheet to look up company names by link
      const allSheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);

      const storeSheet = allSheets.find((s) => s.sheetPurpose === 'Store Database');
      const linkToNameMap: { [normalizedLink: string]: string } = {};

      if (storeSheet) {
        try {
          const storeRange = `${storeSheet.sheetName}!A:ZZ`;
          const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);

          if (storeRows.length > 1) {
            const storeHeaders = storeRows[0];
            const storeLinkIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'link');
            const nameIndex = 0; // Column A = Name
            const dbaIndex = 13; // Column N = DBA

            // Build lookup map: normalized link -> company name
            for (let i = 1; i < storeRows.length; i++) {
              const row = storeRows[i];
              const storeLink = row[storeLinkIndex] || '';
              const dba = row[dbaIndex] || '';
              const name = row[nameIndex] || '';

              if (storeLink) {
                const normalized = normalizeLink(storeLink);
                // Prefer DBA over Name
                linkToNameMap[normalized] = dba || name || storeLink;
              }
            }
          }
        } catch (error) {
          // Continue without names - will fall back to links
        }
      }

      // Convert to array and sort by total commission (descending)
      const topClients = Object.entries(clientMetrics)
        .map(([link, metrics]) => {
          const normalizedLink = normalizeLink(link);
          const companyName = linkToNameMap[normalizedLink] || link;

          return {
            id: link,
            name: companyName, // Use company name from Store Database (DBA > Name), fallback to link
            totalRevenue: metrics.totalCommission.toFixed(2),
            totalCommission: metrics.totalCommission.toFixed(2),
            orderCount: metrics.orderCount,
            firstOrderDate: metrics.firstOrderDate,
            lastOrderDate: metrics.lastOrderDate,
          };
        })
        .sort((a, b) => parseFloat(b.totalCommission) - parseFloat(a.totalCommission))
        .slice(0, topLimit);

      res.json({ topClients });
    } catch (error: any) {
      console.error('Error fetching top clients:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch top clients' });
    }
  });
}
