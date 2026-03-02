import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

export function buildAnalyticsDashboardSummaryEndpointHandler() {
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
      // Get Commission Tracker sheet
      const trackerSheet = await storage.getGoogleSheetByPurpose('commissions', req.user.tenantId);
      if (!trackerSheet) {
          return res.json({
              totalEarnings: '0.00',
              monthlyAverage: '0.00',
              thisMonthEarnings: '0.00',
              lastMonthEarnings: '0.00',
              projectedEarnings: '0.00',
              bestMonth: { month: '', earnings: '0.00' },
              commissionBreakdown: { commission25: '0.00', commission10: '0.00' },
          });
      }
      // Read Commission Tracker data
      const trackerRange = `${trackerSheet.sheetName}!A:G`;
      const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);
      if (trackerRows.length <= 1) {
          return res.json({
              totalEarnings: '0.00',
              monthlyAverage: '0.00',
              thisMonthEarnings: '0.00',
              lastMonthEarnings: '0.00',
              projectedEarnings: '0.00',
              bestMonth: { month: '', earnings: '0.00' },
              commissionBreakdown: { commission25: '0.00', commission10: '0.00' },
          });
      }
      // Parse headers to find column indices
      const headers = trackerRows[0];
      const dateIndex = headers.findIndex((h: string) => h.toLowerCase() === 'date');
      const amountIndex = headers.findIndex((h: string) => h.toLowerCase() === 'amount');
      const commissionTypeIndex = headers.findIndex((h: string) => h.toLowerCase() === 'commission type');
      const agentIndex = headers.findIndex((h: string) => h.toLowerCase() === 'agent name');
      // Calculate metrics
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      let totalEarnings = 0;
      let thisMonthEarnings = 0;
      let lastMonthEarnings = 0;
      let commission25Earnings = 0;
      let commission10Earnings = 0;
      const monthlyEarnings: {
          [key: string]: number;
      } = {};
      // Process each tracker row
      for (let i = 1; i < trackerRows.length; i++) {
          const row = trackerRows[i];
          const dateStr = row[dateIndex] || '';
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
              const isAllowed = allowedAgentNames.some((name) => name.toLowerCase().trim() === rowAgentNormalized);
              if (!isAllowed) {
                  continue;
              }
          }
          // Parse amount
          const amount = parseFloat(String(amountStr).replace(/[^0-9.-]/g, '')) || 0;
          if (amount === 0) {
              continue;
          }
          totalEarnings += amount;
          // Parse date (handle formats: MM/DD/YYYY, M/D/YYYY, etc.)
          let orderDate: Date | null = null;
          if (dateStr) {
              const parsed = new Date(dateStr);
              if (!isNaN(parsed.getTime())) {
                  orderDate = parsed;
              }
          }
          if (orderDate) {
              // Monthly tracking
              const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
              monthlyEarnings[monthKey] = (monthlyEarnings[monthKey] || 0) + amount;
              // This month vs last month
              if (orderDate >= thisMonthStart) {
                  thisMonthEarnings += amount;
              }
              if (orderDate >= lastMonthStart && orderDate <= lastMonthEnd) {
                  lastMonthEarnings += amount;
              }
          }
          // Track by commission type
          if (commissionType.includes('25')) {
              commission25Earnings += amount;
          }
          else if (commissionType.includes('10')) {
              commission10Earnings += amount;
          }
      }
      // Find best month
      let bestMonth = { month: '', earnings: 0 };
      for (const [month, earnings] of Object.entries(monthlyEarnings)) {
          if (earnings > bestMonth.earnings) {
              bestMonth = { month, earnings };
          }
      }
      // Calculate monthly average (last 6 months)
      const last6Months = Object.entries(monthlyEarnings)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .slice(0, 6);
      const monthlyAverage = last6Months.length > 0
          ? last6Months.reduce((sum, [_, val]) => sum + val, 0) / last6Months.length
          : 0;
      // Calculate projected earnings (based on this month's daily average)
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const currentDay = now.getDate();
      const projectedEarnings = currentDay > 0 ? (thisMonthEarnings / currentDay) * daysInMonth : 0;
      res.json({
          totalEarnings: totalEarnings.toFixed(2),
          monthlyAverage: monthlyAverage.toFixed(2),
          thisMonthEarnings: thisMonthEarnings.toFixed(2),
          lastMonthEarnings: lastMonthEarnings.toFixed(2),
          projectedEarnings: projectedEarnings.toFixed(2),
          bestMonth: {
              month: bestMonth.month,
              earnings: bestMonth.earnings.toFixed(2),
          },
          commissionBreakdown: {
              commission25: commission25Earnings.toFixed(2),
              commission10: commission10Earnings.toFixed(2),
          },
      });
    }
    catch (error: any) {
      console.error('Error fetching dashboard summary:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch dashboard summary' });
    }
  };
}
