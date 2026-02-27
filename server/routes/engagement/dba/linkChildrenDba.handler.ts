import { normalizeLink } from "../../../../shared/linkUtils";
import type { DbaRouteDeps } from "./types";

export function buildLinkChildrenDbaHandler(deps: DbaRouteDeps) {
  const { storage, googleSheets, clearUserCache } = deps;

  return async (req: any, res: any) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { parentLink, childLinks, liveCardData } = req.body;
      if (!parentLink || !childLinks || !Array.isArray(childLinks) || childLinks.length === 0) {
          return res.status(400).json({ message: "Parent link and child links array are required" });
      }
      const sheets = await storage.getAllActiveGoogleSheets((req.user as any).tenantId);
      const trackerSheet = sheets.find((s: any) => s.sheetPurpose === 'commissions');
      if (!trackerSheet) {
          return res.status(404).json({ message: 'Commission Tracker sheet not found' });
      }
      const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
      const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);
      if (trackerRows.length === 0) {
          return res.status(404).json({ message: 'Commission Tracker is empty' });
      }
      const trackerHeaders = trackerRows[0];
      const linkIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'link');
      const parentLinkIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'parent link');
      const notesIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'notes');
      const pocNameIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'point of contact');
      const pocEmailIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'poc email');
      const pocPhoneIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'poc phone');
      const nameIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'name' || h.toLowerCase() === 'store name');
      if (linkIndex === -1) {
          return res.status(404).json({ message: 'Link column not found' });
      }
      if (parentLinkIndex === -1) {
          return res.status(404).json({ message: 'Parent Link column not found in Commission Tracker. Please add a "Parent Link" column.' });
      }
      const normalizedParentLink = normalizeLink(parentLink);
      const updates: {
          range: string;
          values: any[][];
      }[] = [];
      let linkedCount = 0;
      let parentRowIndex = -1;
      for (let i = 1; i < trackerRows.length; i++) {
          if (normalizeLink(trackerRows[i][linkIndex] || '') === normalizedParentLink) {
              parentRowIndex = i;
              break;
          }
      }
      for (const childLink of childLinks) {
          const normalizedChildLink = normalizeLink(childLink);
          for (let i = 1; i < trackerRows.length; i++) {
              if (normalizeLink(trackerRows[i][linkIndex] || '') === normalizedChildLink) {
                  const rowIndex = i + 1;
                  const colLetter = String.fromCharCode(65 + parentLinkIndex);
                  updates.push({
                      range: `${trackerSheet.sheetName}!${colLetter}${rowIndex}`,
                      values: [[parentLink]]
                  });
                  if (parentRowIndex !== -1) {
                      const childRow = trackerRows[i];
                      const childName = (nameIndex !== -1 ? childRow[nameIndex] : '') || childLink || 'Child Location';
                      if (notesIndex !== -1) {
                          const childNotes = (childRow[notesIndex] || '').toString().trim();
                          if (childNotes) {
                              const existingParentNotes = (trackerRows[parentRowIndex][notesIndex] || '').toString().trim();
                              trackerRows[parentRowIndex][notesIndex] = existingParentNotes
                                  ? `${existingParentNotes}\n\n[From ${childName}]: ${childNotes}`
                                  : childNotes;
                          }
                      }
                      if (pocNameIndex !== -1) {
                          const val = (childRow[pocNameIndex] || '').toString().trim();
                          if (val)
                              trackerRows[parentRowIndex][pocNameIndex] = val;
                      }
                      if (pocEmailIndex !== -1) {
                          const val = (childRow[pocEmailIndex] || '').toString().trim();
                          if (val)
                              trackerRows[parentRowIndex][pocEmailIndex] = val;
                      }
                      if (pocPhoneIndex !== -1) {
                          const val = (childRow[pocPhoneIndex] || '').toString().trim();
                          if (val)
                              trackerRows[parentRowIndex][pocPhoneIndex] = val;
                      }
                  }
                  linkedCount++;
                  break;
              }
          }
      }
      if (parentRowIndex !== -1) {
          if (liveCardData) {
              if (liveCardData.pointOfContact && pocNameIndex !== -1) {
                  trackerRows[parentRowIndex][pocNameIndex] = liveCardData.pointOfContact;
              }
              if (liveCardData.pocEmail && pocEmailIndex !== -1) {
                  trackerRows[parentRowIndex][pocEmailIndex] = liveCardData.pocEmail;
              }
              if (liveCardData.pocPhone && pocPhoneIndex !== -1) {
                  trackerRows[parentRowIndex][pocPhoneIndex] = liveCardData.pocPhone;
              }
              if (liveCardData.notes && notesIndex !== -1) {
                  const liveLabel = liveCardData.storeName || 'Open Card';
                  const current = (trackerRows[parentRowIndex][notesIndex] || '').toString().trim();
                  trackerRows[parentRowIndex][notesIndex] = current
                      ? `${current}\n\n[From ${liveLabel}]: ${liveCardData.notes}`
                      : liveCardData.notes;
              }
          }
          const parentSheetRow = parentRowIndex + 1;
          if (notesIndex !== -1) {
              const notesCol = String.fromCharCode(65 + notesIndex);
              updates.push({
                  range: `${trackerSheet.sheetName}!${notesCol}${parentSheetRow}`,
                  values: [[trackerRows[parentRowIndex][notesIndex] || '']]
              });
          }
          if (pocNameIndex !== -1) {
              const col = String.fromCharCode(65 + pocNameIndex);
              updates.push({
                  range: `${trackerSheet.sheetName}!${col}${parentSheetRow}`,
                  values: [[trackerRows[parentRowIndex][pocNameIndex] || '']]
              });
          }
          if (pocEmailIndex !== -1) {
              const col = String.fromCharCode(65 + pocEmailIndex);
              updates.push({
                  range: `${trackerSheet.sheetName}!${col}${parentSheetRow}`,
                  values: [[trackerRows[parentRowIndex][pocEmailIndex] || '']]
              });
          }
          if (pocPhoneIndex !== -1) {
              const col = String.fromCharCode(65 + pocPhoneIndex);
              updates.push({
                  range: `${trackerSheet.sheetName}!${col}${parentSheetRow}`,
                  values: [[trackerRows[parentRowIndex][pocPhoneIndex] || '']]
              });
          }
      }
      for (const update of updates) {
          await googleSheets.writeSheetData(trackerSheet.spreadsheetId, update.range, update.values);
      }
      clearUserCache(userId);
      res.json({
          success: true,
          message: `Successfully linked ${linkedCount} location(s) to parent DBA`,
          linkedCount
      });
    }
    catch (error: any) {
      console.error("Error linking child locations:", error);
      res.status(500).json({ message: error.message || "Failed to link child locations" });
    }
  };
}
