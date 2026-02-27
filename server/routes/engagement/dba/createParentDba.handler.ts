import { v4 as uuidv4 } from "uuid";
import { normalizeLink } from "../../../../shared/linkUtils";
import type { DbaRouteDeps } from "./types";

export function buildCreateParentDbaHandler(deps: DbaRouteDeps) {
  const { storage, googleSheets, clearUserCache } = deps;

  return async (req: any, res: any) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { dbaName, parentLink, pocName, pocEmail, pocPhone, notes, agentName, status, address, city, state, phone, email, childLinks, liveCardData } = req.body;
      if (!dbaName || !dbaName.trim()) {
          return res.status(400).json({ message: "DBA name is required" });
      }
      // Find Commission Tracker sheet
      const sheets = await storage.getAllActiveGoogleSheets((req.user as any).tenantId);
      const trackerSheet = sheets.find((s: any) => s.sheetPurpose === 'commissions');
      if (!trackerSheet) {
          return res.status(404).json({ message: 'Commission Tracker sheet not found' });
      }
      // Read tracker data
      const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
      const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);
      if (trackerRows.length === 0) {
          return res.status(404).json({ message: 'Commission Tracker is empty' });
      }
      const trackerHeaders = trackerRows[0];
      const linkIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'link');
      const dbaIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'dba');
      const isParentIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'is parent');
      const pocNameIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'point of contact');
      const pocEmailIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'poc email');
      const pocPhoneIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'poc phone');
      const notesIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'notes');
      const agentIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'agent name');
      // If updating an existing location to be parent
      if (parentLink) {
          const normalizedParentLink = normalizeLink(parentLink);
          let foundRowIndex = -1;
          for (let i = 1; i < trackerRows.length; i++) {
              if (normalizeLink(trackerRows[i][linkIndex] || '') === normalizedParentLink) {
                  foundRowIndex = i + 1; // 1-indexed
                  break;
              }
          }
          if (foundRowIndex !== -1) {
              // Update existing row to be parent
              const updates: {
                  range: string;
                  values: any[][];
              }[] = [];
              if (isParentIndex !== -1) {
                  const colLetter = String.fromCharCode(65 + isParentIndex);
                  updates.push({
                      range: `${trackerSheet.sheetName}!${colLetter}${foundRowIndex}`,
                      values: [['TRUE']]
                  });
              }
              if (dbaIndex !== -1) {
                  const colLetter = String.fromCharCode(65 + dbaIndex);
                  updates.push({
                      range: `${trackerSheet.sheetName}!${colLetter}${foundRowIndex}`,
                      values: [[dbaName]]
                  });
              }
              const finalPocName = pocName || (liveCardData?.pointOfContact) || '';
              const finalPocEmail = pocEmail || (liveCardData?.pocEmail) || '';
              const finalPocPhone = pocPhone || (liveCardData?.pocPhone) || '';
              if (finalPocName && pocNameIndex !== -1) {
                  const colLetter = String.fromCharCode(65 + pocNameIndex);
                  updates.push({
                      range: `${trackerSheet.sheetName}!${colLetter}${foundRowIndex}`,
                      values: [[finalPocName]]
                  });
              }
              if (finalPocEmail && pocEmailIndex !== -1) {
                  const colLetter = String.fromCharCode(65 + pocEmailIndex);
                  updates.push({
                      range: `${trackerSheet.sheetName}!${colLetter}${foundRowIndex}`,
                      values: [[finalPocEmail]]
                  });
              }
              if (finalPocPhone && pocPhoneIndex !== -1) {
                  const colLetter = String.fromCharCode(65 + pocPhoneIndex);
                  updates.push({
                      range: `${trackerSheet.sheetName}!${colLetter}${foundRowIndex}`,
                      values: [[finalPocPhone]]
                  });
              }
              if (notesIndex !== -1) {
                  const existingNotes = (trackerRows[foundRowIndex - 1][notesIndex] || '').toString().trim();
                  let aggregatedNotes = existingNotes;
                  if (notes) {
                      aggregatedNotes = aggregatedNotes
                          ? `${aggregatedNotes}\n\n${notes}`
                          : notes;
                  }
                  if (liveCardData?.notes) {
                      const liveLabel = liveCardData.storeName || 'Open Card';
                      aggregatedNotes = aggregatedNotes
                          ? `${aggregatedNotes}\n\n[From ${liveLabel}]: ${liveCardData.notes}`
                          : liveCardData.notes;
                  }
                  if (childLinks && Array.isArray(childLinks) && childLinks.length > 0) {
                      const nameIdx = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'name' || h.toLowerCase() === 'store name');
                      for (const childLink of childLinks) {
                          const normalizedChild = normalizeLink(childLink);
                          for (let i = 1; i < trackerRows.length; i++) {
                              if (normalizeLink(trackerRows[i][linkIndex] || '') === normalizedChild) {
                                  const childNotes = (trackerRows[i][notesIndex] || '').toString().trim();
                                  const childName = (nameIdx !== -1 ? trackerRows[i][nameIdx] : '') || childLink || 'Child Location';
                                  if (childNotes) {
                                      aggregatedNotes = aggregatedNotes
                                          ? `${aggregatedNotes}\n\n[From ${childName}]: ${childNotes}`
                                          : childNotes;
                                  }
                                  if (!finalPocName && pocNameIndex !== -1) {
                                      const val = (trackerRows[i][pocNameIndex] || '').toString().trim();
                                      if (val) {
                                          const col = String.fromCharCode(65 + pocNameIndex);
                                          updates.push({ range: `${trackerSheet.sheetName}!${col}${foundRowIndex}`, values: [[val]] });
                                      }
                                  }
                                  if (!finalPocEmail && pocEmailIndex !== -1) {
                                      const val = (trackerRows[i][pocEmailIndex] || '').toString().trim();
                                      if (val) {
                                          const col = String.fromCharCode(65 + pocEmailIndex);
                                          updates.push({ range: `${trackerSheet.sheetName}!${col}${foundRowIndex}`, values: [[val]] });
                                      }
                                  }
                                  if (!finalPocPhone && pocPhoneIndex !== -1) {
                                      const val = (trackerRows[i][pocPhoneIndex] || '').toString().trim();
                                      if (val) {
                                          const col = String.fromCharCode(65 + pocPhoneIndex);
                                          updates.push({ range: `${trackerSheet.sheetName}!${col}${foundRowIndex}`, values: [[val]] });
                                      }
                                  }
                                  break;
                              }
                          }
                      }
                  }
                  if (aggregatedNotes !== existingNotes) {
                      const colLetter = String.fromCharCode(65 + notesIndex);
                      const existingUpdate = updates.findIndex(u => u.range === `${trackerSheet.sheetName}!${colLetter}${foundRowIndex}`);
                      if (existingUpdate !== -1) {
                          updates[existingUpdate].values = [[aggregatedNotes]];
                      }
                      else {
                          updates.push({
                              range: `${trackerSheet.sheetName}!${colLetter}${foundRowIndex}`,
                              values: [[aggregatedNotes]]
                          });
                      }
                  }
              }
              for (const update of updates) {
                  await googleSheets.writeSheetData(trackerSheet.spreadsheetId, update.range, update.values);
              }
              clearUserCache(userId);
              return res.json({
                  success: true,
                  message: 'Parent DBA record updated successfully',
                  parentLink
              });
          }
      }
      // Create new parent record (corporate office with full location data)
      // Generate a proper UUID for the corporate office
      const corporateUuid = uuidv4();
      // Find Store Database sheet
      const storeSheet = sheets.find((s: any) => s.sheetPurpose === 'Store Database');
      if (!storeSheet) {
          return res.status(404).json({ message: 'Store Database sheet not found' });
      }
      // Read Store Database to get category from first child location
      const storeRange = `${storeSheet.sheetName}!A:ZZ`;
      const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);
      if (storeRows.length === 0) {
          return res.status(404).json({ message: 'Store Database is empty' });
      }
      const storeHeaders = storeRows[0];
      const storeLinkIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'link');
      const categoryIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'category');
      // Get category from first child location (all children should have same category)
      let category = '';
      if (childLinks && childLinks.length > 0 && categoryIndex !== -1) {
          const normalizedFirstChild = normalizeLink(childLinks[0]);
          for (let i = 1; i < storeRows.length; i++) {
              if (normalizeLink(storeRows[i][storeLinkIndex] || '') === normalizedFirstChild) {
                  category = storeRows[i][categoryIndex] || '';
                  break;
              }
          }
      }
      // STEP 1: Write to Store Database sheet
      // Columns: A=Name, C=Link, E=Address, F=City, G=State, S=Category
      const storeNameIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'name');
      const storeAddressIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'address');
      const storeCityIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'city');
      const storeStateIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'state');
      const storePhoneIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'phone');
      const storeEmailIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'email');
      const storeStatusIndex = storeHeaders.findIndex((h: string) => h.toLowerCase() === 'status');
      const storeRow = new Array(storeHeaders.length).fill('');
      if (storeNameIndex !== -1)
          storeRow[storeNameIndex] = dbaName;
      if (storeLinkIndex !== -1)
          storeRow[storeLinkIndex] = corporateUuid;
      if (storeAddressIndex !== -1)
          storeRow[storeAddressIndex] = address || '';
      if (storeCityIndex !== -1)
          storeRow[storeCityIndex] = city || '';
      if (storeStateIndex !== -1)
          storeRow[storeStateIndex] = state || '';
      if (storePhoneIndex !== -1)
          storeRow[storePhoneIndex] = phone || '';
      if (storeEmailIndex !== -1)
          storeRow[storeEmailIndex] = email || '';
      if (categoryIndex !== -1)
          storeRow[categoryIndex] = category;
      if (storeStatusIndex !== -1 && status)
          storeRow[storeStatusIndex] = status;
      await googleSheets.appendSheetData(storeSheet.spreadsheetId, `${storeSheet.sheetName}`, [storeRow]);
      // STEP 2: Write to Commission Tracker sheet
      // Columns: A=Link, D=Agent Name, H=Status, R=DBA
      const trackerRow = new Array(trackerHeaders.length).fill('');
      if (linkIndex !== -1)
          trackerRow[linkIndex] = corporateUuid;
      if (dbaIndex !== -1)
          trackerRow[dbaIndex] = dbaName;
      if (isParentIndex !== -1)
          trackerRow[isParentIndex] = 'TRUE';
      const newPocName = pocName || liveCardData?.pointOfContact || '';
      const newPocEmail = pocEmail || liveCardData?.pocEmail || '';
      const newPocPhone = pocPhone || liveCardData?.pocPhone || '';
      if (pocNameIndex !== -1 && newPocName)
          trackerRow[pocNameIndex] = newPocName;
      if (pocEmailIndex !== -1 && newPocEmail)
          trackerRow[pocEmailIndex] = newPocEmail;
      if (pocPhoneIndex !== -1 && newPocPhone)
          trackerRow[pocPhoneIndex] = newPocPhone;
      if (notesIndex !== -1 && notes)
          trackerRow[notesIndex] = notes;
      if (agentIndex !== -1 && agentName)
          trackerRow[agentIndex] = agentName;
      // Set status (default to 'claimed' for new DBA parents)
      const statusIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'status');
      if (statusIndex !== -1)
          trackerRow[statusIndex] = status || 'claimed';
      await googleSheets.appendSheetData(trackerSheet.spreadsheetId, `${trackerSheet.sheetName}`, [trackerRow]);
      clearUserCache(userId);
      res.json({
          success: true,
          message: 'Parent DBA record created successfully in both Store Database and Commission Tracker',
          parentLink: corporateUuid
      });
    }
    catch (error: any) {
      console.error("Error creating parent DBA:", error);
      res.status(500).json({ message: error.message || "Failed to create parent DBA" });
    }
  };
}
