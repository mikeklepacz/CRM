import type { DbaRouteDeps } from "./types";
import { normalizeLink } from "../../../../shared/linkUtils";

export function registerUnlinkChildrenDbaRoute(deps: DbaRouteDeps) {
  const { app, storage, googleSheets, isAuthenticatedCustom, clearUserCache } = deps;

  // Unlink child locations from a parent DBA
  app.post('/api/dba/unlink-children', isAuthenticatedCustom, async (req: any, res) => {
      try {
          const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
          const { childLinks } = req.body;
          if (!childLinks || !Array.isArray(childLinks) || childLinks.length === 0) {
              return res.status(400).json({ message: "Child links array is required" });
          }
          const sheets = await storage.getAllActiveGoogleSheets((req.user as any).tenantId);
          const trackerSheet = sheets.find((s: any) => s.sheetPurpose === 'commissions');
          if (!trackerSheet) {
              return res.status(404).json({ message: 'Commission Tracker sheet not found' });
          }
          const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
          const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);
          const trackerHeaders = trackerRows[0];
          const linkIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'link');
          const parentLinkIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'parent link');
          if (parentLinkIndex === -1) {
              return res.status(404).json({ message: 'Parent Link column not found' });
          }
          const updates: {
              range: string;
              values: any[][];
          }[] = [];
          let unlinkedCount = 0;
          // Clear parent link for each child
          for (const childLink of childLinks) {
              const normalizedChildLink = normalizeLink(childLink);
              for (let i = 1; i < trackerRows.length; i++) {
                  if (normalizeLink(trackerRows[i][linkIndex] || '') === normalizedChildLink) {
                      const rowIndex = i + 1;
                      const colLetter = String.fromCharCode(65 + parentLinkIndex);
                      updates.push({
                          range: `${trackerSheet.sheetName}!${colLetter}${rowIndex}`,
                          values: [['']]
                      });
                      unlinkedCount++;
                      break;
                  }
              }
          }
          // Execute all updates
          for (const update of updates) {
              await googleSheets.writeSheetData(trackerSheet.spreadsheetId, update.range, update.values);
          }
          clearUserCache(userId);
          res.json({
              success: true,
              message: `Successfully unlinked ${unlinkedCount} location(s) from parent DBA`,
              unlinkedCount
          });
      }
      catch (error: any) {
          console.error("Error unlinking child locations:", error);
          res.status(500).json({ message: error.message || "Failed to unlink child locations" });
      }
  });
}
