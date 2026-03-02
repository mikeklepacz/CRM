import type { DbaRouteDeps } from "./types";
import { normalizeLink } from "../../../../shared/linkUtils";

export function registerSetHeadOfficeDbaRoute(deps: DbaRouteDeps) {
  const { app, storage, googleSheets, isAuthenticatedCustom, clearUserCache } = deps;

  // Set head office for a DBA group
  app.post('/api/dba/set-head-office', isAuthenticatedCustom, async (req: any, res) => {
      try {
          const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
          const { headOfficeLink, parentLink, mergePocInfo } = req.body;
          if (!headOfficeLink) {
              return res.status(400).json({ message: "Head office link is required" });
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
          const headOfficeLinkIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'head office link');
          const parentLinkIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'parent link');
          if (headOfficeLinkIndex === -1) {
              return res.status(404).json({ message: 'Head Office Link column not found in Commission Tracker. Please add a "Head Office Link" column.' });
          }
          const normalizedHeadOfficeLink = normalizeLink(headOfficeLink);
          const normalizedParentLink = parentLink ? normalizeLink(parentLink) : null;
          // Find parent row and head office row
          let parentRowIndex = -1;
          let headOfficeRowIndex = -1;
          let headOfficeData: any = {};
          for (let i = 1; i < trackerRows.length; i++) {
              const rowLink = normalizeLink(trackerRows[i][linkIndex] || '');
              if (rowLink === normalizedHeadOfficeLink) {
                  headOfficeRowIndex = i + 1;
                  // Store head office data
                  trackerHeaders.forEach((header: any, idx: number) => {
                      headOfficeData[header] = trackerRows[i][idx] || '';
                  });
              }
              if (normalizedParentLink && rowLink === normalizedParentLink) {
                  parentRowIndex = i + 1;
              }
          }
          const updates: {
              range: string;
              values: any[][];
          }[] = [];
          // Set head office link on parent (if parent exists)
          if (parentRowIndex !== -1 && headOfficeLinkIndex !== -1) {
              const colLetter = String.fromCharCode(65 + headOfficeLinkIndex);
              updates.push({
                  range: `${trackerSheet.sheetName}!${colLetter}${parentRowIndex}`,
                  values: [[headOfficeLink]]
              });
              // Merge POC info from head office to parent if requested
              if (mergePocInfo && headOfficeRowIndex !== -1) {
                  const pocNameIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'point of contact');
                  const pocEmailIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'poc email');
                  const pocPhoneIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'poc phone');
                  const notesIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'notes');
                  if (pocNameIndex !== -1 && headOfficeData['Point of Contact']) {
                      const colLetter = String.fromCharCode(65 + pocNameIndex);
                      updates.push({
                          range: `${trackerSheet.sheetName}!${colLetter}${parentRowIndex}`,
                          values: [[headOfficeData['Point of Contact']]]
                      });
                  }
                  if (pocEmailIndex !== -1 && headOfficeData['POC Email']) {
                      const colLetter = String.fromCharCode(65 + pocEmailIndex);
                      updates.push({
                          range: `${trackerSheet.sheetName}!${colLetter}${parentRowIndex}`,
                          values: [[headOfficeData['POC Email']]]
                      });
                  }
                  if (pocPhoneIndex !== -1 && headOfficeData['POC Phone']) {
                      const colLetter = String.fromCharCode(65 + pocPhoneIndex);
                      updates.push({
                          range: `${trackerSheet.sheetName}!${colLetter}${parentRowIndex}`,
                          values: [[headOfficeData['POC Phone']]]
                      });
                  }
                  // Append notes instead of overwriting
                  if (notesIndex !== -1 && headOfficeData['Notes']) {
                      const existingNotes = trackerRows[parentRowIndex - 1][notesIndex] || '';
                      const mergedNotes = existingNotes
                          ? `${existingNotes}\n\n[From ${headOfficeData['Name'] || 'Head Office'}]: ${headOfficeData['Notes']}`
                          : headOfficeData['Notes'];
                      const colLetter = String.fromCharCode(65 + notesIndex);
                      updates.push({
                          range: `${trackerSheet.sheetName}!${colLetter}${parentRowIndex}`,
                          values: [[mergedNotes]]
                      });
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
              message: 'Head office set successfully',
              pocInfoMerged: mergePocInfo && parentRowIndex !== -1
          });
      }
      catch (error: any) {
          console.error("Error setting head office:", error);
          res.status(500).json({ message: error.message || "Failed to set head office" });
      }
  });
}
