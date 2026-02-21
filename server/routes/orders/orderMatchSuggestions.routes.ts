import type { Express } from "express";
import { normalizeLink } from "../../../shared/linkUtils";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

function stringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1;

  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;

  const matrix: number[][] = [];
  for (let i = 0; i <= len2; i++) matrix[i] = [i];
  for (let j = 0; j <= len1; j++) matrix[0][j] = j;

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      const cost = s1[j - 1] === s2[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }

  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  return 1 - (distance / maxLen);
}

export function registerOrderMatchSuggestionsRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any },
): void {
  // Get smart match suggestions for an order (searches Google Sheets Store Database)
  // Supports manual search via ?search=term query parameter
  app.get('/api/orders/:orderId/match-suggestions', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { orderId } = req.params;
      const manualSearch = req.query.search || ''; // Manual search term from query param

      const tenantId = req.user.tenantId;
      const order = await storage.getOrderById(orderId, tenantId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Find Store Database and Commission Tracker sheets
      const sheets = await storage.getAllActiveGoogleSheets((req.user as any).tenantId);
      const storeSheet = sheets.find(s => s.sheetPurpose === 'Store Database');
      const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');

      if (!storeSheet) {
        return res.status(404).json({ message: 'Store Database sheet not found' });
      }

      // Check Commission Tracker for already-matched stores (trackerSheet from line above)
      const matchedStoreLinks: string[] = [];
      if (trackerSheet) {
        try {
          const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
          const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

          if (trackerRows.length > 0) {
            const trackerHeaders = trackerRows[0];
            const linkIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'link');
            const transactionIdIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'transaction id');

            // Find all stores matched to this order
            for (let i = 1; i < trackerRows.length; i++) {
              const trackerTransactionId = trackerRows[i][transactionIdIndex] || '';
              if (trackerTransactionId === orderId) {
                const storeLink = trackerRows[i][linkIndex] || '';
                if (storeLink) {
                  matchedStoreLinks.push(normalizeLink(storeLink));
                }
              }
            }
          }
        } catch (trackerError) {
          console.error('Error checking Commission Tracker:', trackerError);
          // Continue even if tracker check fails
        }
      }

      // Read all store data
      const storeRange = `${storeSheet.sheetName}!A:ZZ`;
      const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);

      if (storeRows.length === 0) {
        return res.json({ order, suggestions: [], matchedStoreLinks });
      }

      // Parse store data
      const storeHeaders = storeRows[0];
      const nameIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'name');
      const dbaIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'dba');
      const linkIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'link');
      const emailIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'email');
      const cityIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'city');
      const stateIndex = storeHeaders.findIndex(h => h.toLowerCase() === 'state');

      const suggestions: any[] = [];
      const orderCompany = order.billingCompany || '';
      const orderEmail = order.billingEmail || '';
      const isManualSearch = manualSearch.trim().length > 0;
      const searchLower = manualSearch.toLowerCase().trim();

      // Process each store row
      storeRows.slice(1).forEach((row, index) => {
        let score = 0;
        const reasons: string[] = [];

        const storeName = nameIndex !== -1 ? (row[nameIndex] || '') : '';
        const storeDba = dbaIndex !== -1 ? (row[dbaIndex] || '') : '';
        const storeLink = linkIndex !== -1 ? (row[linkIndex] || '') : '';
        const storeEmail = emailIndex !== -1 ? (row[emailIndex] || '') : '';
        const storeCity = cityIndex !== -1 ? (row[cityIndex] || '') : '';
        const storeState = stateIndex !== -1 ? (row[stateIndex] || '') : '';

        // MANUAL SEARCH MODE: Simple substring matching
        if (isManualSearch) {
          const nameMatch = storeName.toLowerCase().includes(searchLower);
          const dbaMatch = storeDba.toLowerCase().includes(searchLower);
          const emailMatch = storeEmail.toLowerCase().includes(searchLower);

          if (nameMatch || dbaMatch || emailMatch) {
            score = 50; // Base score for manual matches
            if (nameMatch) reasons.push('Name match');
            if (dbaMatch) reasons.push('DBA match');
            if (emailMatch) reasons.push('Email match');
          }
        } 
        // AI SMART MATCHING MODE: Fuzzy matching based on order data
        else {
          // Company name similarity (check both Name and DBA fields)
          if (orderCompany && (storeName || storeDba)) {
            const nameSimilarity = stringSimilarity(orderCompany, storeName);
            const dbaSimilarity = storeDba ? stringSimilarity(orderCompany, storeDba) : 0;
            const companySimilarity = Math.max(nameSimilarity, dbaSimilarity);

            if (companySimilarity > 0.6) {
              score += companySimilarity * 50;
              reasons.push(`Company name ${Math.round(companySimilarity * 100)}% similar`);
            }
          }

          // Email similarity
          if (orderEmail && storeEmail) {
            const emailSimilarity = stringSimilarity(orderEmail, storeEmail);
            if (emailSimilarity > 0.8) {
              score += emailSimilarity * 30;
              reasons.push(`Email ${Math.round(emailSimilarity * 100)}% similar`);
            }
          }

          // Exact email match (highest priority)
          if (orderEmail && storeEmail && orderEmail.toLowerCase() === storeEmail.toLowerCase()) {
            score += 100;
            reasons.push('Exact email match');
          }

          // Exact company match (check both Name and DBA)
          if (orderCompany) {
            const exactNameMatch = storeName && orderCompany.toLowerCase() === storeName.toLowerCase();
            const exactDbaMatch = storeDba && orderCompany.toLowerCase() === storeDba.toLowerCase();

            if (exactNameMatch || exactDbaMatch) {
              score += 100;
              reasons.push('Exact company name match');
            }
          }
        }

        // Add to suggestions if score is high enough
        if (score > 10) {
          suggestions.push({
            rowIndex: index + 2,
            link: storeLink,
            name: storeName,
            dba: storeDba,
            email: storeEmail,
            score: Math.min(score, 100),
            reasons,
            displayName: storeName || storeDba || storeEmail,
            displayInfo: `${storeCity ? storeCity + ', ' : ''}${storeState || ''}`.trim(),
          });
        }
      });

      // Sort by score descending and return top results
      suggestions.sort((a, b) => b.score - a.score);
      const limit = isManualSearch ? 100 : 20; // More results for manual search
      const topSuggestions = suggestions.slice(0, limit);

      res.json({
        order,
        suggestions: topSuggestions,
        matchedStoreLinks, // Array of normalized links for already-matched stores
        isManualSearch,
      });
    } catch (error: any) {
      console.error("Error getting match suggestions:", error);
      res.status(500).json({ message: error.message || "Failed to get suggestions" });
    }
  });
}
