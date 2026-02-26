import type { Express } from "express";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

export function registerAnalyticsCommissionBreakdownRoutes(app: Express): void {
  app.get('/api/analytics/commission-breakdown', async (req: any, res) => {
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
        return res.json({
          breakdown: {
            tier25Percent: { clients: 0, earnings: 0 },
            tier10Percent: { clients: 0, earnings: 0 },
          },
        });
      }

      // Read Commission Tracker data
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

      // Parse headers
      const headers = trackerRows[0];
      const linkIndex = headers.findIndex((h: string) => h.toLowerCase() === 'link');
      const amountIndex = headers.findIndex((h: string) => h.toLowerCase() === 'amount');
      const commissionTypeIndex = headers.findIndex((h: string) => h.toLowerCase() === 'commission type');
      const agentIndex = headers.findIndex((h: string) => h.toLowerCase() === 'agent name');

      // Track unique stores and earnings by tier
      const tier25Stores = new Set<string>();
      const tier10Stores = new Set<string>();
      let tier25Earnings = 0;
      let tier10Earnings = 0;

      for (let i = 1; i < trackerRows.length; i++) {
        const row = trackerRows[i];
        const link = row[linkIndex] || '';
        const amountStr = row[amountIndex] || '0';
        const commissionType = row[commissionTypeIndex] || '';
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
        if (amount === 0) continue;

        if (commissionType.includes('25')) {
          tier25Earnings += amount;
          if (link) tier25Stores.add(link);
        } else if (commissionType.includes('10')) {
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
      console.error('Error fetching commission breakdown:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch commission breakdown' });
    }
  });
}
