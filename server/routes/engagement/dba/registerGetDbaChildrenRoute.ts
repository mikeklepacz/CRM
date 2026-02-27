import type { DbaRouteDeps } from "./types";
import { normalizeLink } from "../../../../shared/linkUtils";

export function registerGetDbaChildrenRoute(deps: DbaRouteDeps) {
  const { app, storage, googleSheets, isAuthenticatedCustom, clearUserCache } = deps;

  // Get all child locations for a parent DBA
  app.get('/api/dba/children/:parentLink', isAuthenticatedCustom, async (req: any, res) => {
      try {
          const { parentLink } = req.params;
          const sheets = await storage.getAllActiveGoogleSheets((req.user as any).tenantId);
          const trackerSheet = sheets.find((s: any) => s.sheetPurpose === 'commissions');
          const storeDbSheet = sheets.find((s: any) => s.sheetPurpose === 'Store Database');
          if (!trackerSheet) {
              return res.status(404).json({ message: 'Commission Tracker sheet not found' });
          }
          const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
          const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);
          const trackerHeaders = trackerRows[0];
          const linkIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'link');
          const parentLinkIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'parent link');
          if (parentLinkIndex === -1) {
              return res.json({ children: [] });
          }
          // Load Store Database to get store names
          let storeDbMap: Map<string, any> = new Map();
          if (storeDbSheet) {
              const storeDbRange = `${storeDbSheet.sheetName}!A:ZZ`;
              const storeDbRows = await googleSheets.readSheetData(storeDbSheet.spreadsheetId, storeDbRange);
              const storeDbHeaders = storeDbRows[0];
              const storeDbLinkIndex = storeDbHeaders.findIndex((h: string) => h.toLowerCase() === 'link');
              const storeDbNameIndex = storeDbHeaders.findIndex((h: string) => h.toLowerCase() === 'name' || h.toLowerCase() === 'store name');
              if (storeDbLinkIndex !== -1) {
                  for (let i = 1; i < storeDbRows.length; i++) {
                      const link = storeDbRows[i][storeDbLinkIndex];
                      if (link) {
                          const storeName = storeDbNameIndex !== -1 ? storeDbRows[i][storeDbNameIndex] : '';
                          storeDbMap.set(normalizeLink(link), storeName);
                      }
                  }
              }
          }
          const normalizedParentLink = normalizeLink(parentLink);
          const children: any[] = [];
          for (let i = 1; i < trackerRows.length; i++) {
              const rowParentLink = trackerRows[i][parentLinkIndex] || '';
              if (normalizeLink(rowParentLink) === normalizedParentLink) {
                  const childData: any = {};
                  trackerHeaders.forEach((header: any, idx: number) => {
                      childData[header] = trackerRows[i][idx] || '';
                  });
                  // Add store name from Store Database if available
                  const childLink = trackerRows[i][linkIndex];
                  if (childLink && storeDbMap.has(normalizeLink(childLink))) {
                      childData['name'] = storeDbMap.get(normalizeLink(childLink));
                      childData['Name'] = storeDbMap.get(normalizeLink(childLink)); // Also add capitalized version for compatibility
                  }
                  children.push(childData);
              }
          }
          res.json({ children });
      }
      catch (error: any) {
          console.error("Error getting child locations:", error);
          res.status(500).json({ message: error.message || "Failed to get child locations" });
      }
  });
}
