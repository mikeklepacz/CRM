import type { Express } from "express";
import { normalizeLink } from "../shared/linkUtils";
import { v4 as uuidv4 } from "uuid";

export function registerDbaRoutes(
  app: Express,
  storage: any,
  googleSheets: any,
  isAuthenticatedCustom: any,
  clearUserCache: (userId: string) => void
) {
  app.post('/api/dba/create-parent', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { 
        dbaName, 
        parentLink, 
        pocName, 
        pocEmail, 
        pocPhone, 
        notes, 
        agentName,
        status,
        address,
        city,
        state,
        phone,
        email,
        childLinks,
        liveCardData
      } = req.body;

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
          const updates: { range: string; values: any[][] }[] = [];

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
              } else {
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
      if (storeNameIndex !== -1) storeRow[storeNameIndex] = dbaName;
      if (storeLinkIndex !== -1) storeRow[storeLinkIndex] = corporateUuid;
      if (storeAddressIndex !== -1) storeRow[storeAddressIndex] = address || '';
      if (storeCityIndex !== -1) storeRow[storeCityIndex] = city || '';
      if (storeStateIndex !== -1) storeRow[storeStateIndex] = state || '';
      if (storePhoneIndex !== -1) storeRow[storePhoneIndex] = phone || '';
      if (storeEmailIndex !== -1) storeRow[storeEmailIndex] = email || '';
      if (categoryIndex !== -1) storeRow[categoryIndex] = category;
      if (storeStatusIndex !== -1 && status) storeRow[storeStatusIndex] = status;

      await googleSheets.appendSheetData(storeSheet.spreadsheetId, `${storeSheet.sheetName}`, [storeRow]);

      // STEP 2: Write to Commission Tracker sheet
      // Columns: A=Link, D=Agent Name, H=Status, R=DBA
      const trackerRow = new Array(trackerHeaders.length).fill('');
      
      if (linkIndex !== -1) trackerRow[linkIndex] = corporateUuid;
      if (dbaIndex !== -1) trackerRow[dbaIndex] = dbaName;
      if (isParentIndex !== -1) trackerRow[isParentIndex] = 'TRUE';
      const newPocName = pocName || liveCardData?.pointOfContact || '';
      const newPocEmail = pocEmail || liveCardData?.pocEmail || '';
      const newPocPhone = pocPhone || liveCardData?.pocPhone || '';
      if (pocNameIndex !== -1 && newPocName) trackerRow[pocNameIndex] = newPocName;
      if (pocEmailIndex !== -1 && newPocEmail) trackerRow[pocEmailIndex] = newPocEmail;
      if (pocPhoneIndex !== -1 && newPocPhone) trackerRow[pocPhoneIndex] = newPocPhone;
      if (notesIndex !== -1 && notes) trackerRow[notesIndex] = notes;
      if (agentIndex !== -1 && agentName) trackerRow[agentIndex] = agentName;

      // Set status (default to 'claimed' for new DBA parents)
      const statusIndex = trackerHeaders.findIndex((h: string) => h.toLowerCase() === 'status');
      if (statusIndex !== -1) trackerRow[statusIndex] = status || 'claimed';

      await googleSheets.appendSheetData(trackerSheet.spreadsheetId, `${trackerSheet.sheetName}`, [trackerRow]);

      clearUserCache(userId);
      res.json({ 
        success: true, 
        message: 'Parent DBA record created successfully in both Store Database and Commission Tracker',
        parentLink: corporateUuid
      });
    } catch (error: any) {
      console.error("Error creating parent DBA:", error);
      res.status(500).json({ message: error.message || "Failed to create parent DBA" });
    }
  });

  // Link child locations to a parent DBA
  app.post('/api/dba/link-children', isAuthenticatedCustom, async (req: any, res) => {
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
      const updates: { range: string; values: any[][] }[] = [];
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
                if (val) trackerRows[parentRowIndex][pocNameIndex] = val;
              }
              if (pocEmailIndex !== -1) {
                const val = (childRow[pocEmailIndex] || '').toString().trim();
                if (val) trackerRows[parentRowIndex][pocEmailIndex] = val;
              }
              if (pocPhoneIndex !== -1) {
                const val = (childRow[pocPhoneIndex] || '').toString().trim();
                if (val) trackerRows[parentRowIndex][pocPhoneIndex] = val;
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
    } catch (error: any) {
      console.error("Error linking child locations:", error);
      res.status(500).json({ message: error.message || "Failed to link child locations" });
    }
  });

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

      const updates: { range: string; values: any[][] }[] = [];
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
    } catch (error: any) {
      console.error("Error unlinking child locations:", error);
      res.status(500).json({ message: error.message || "Failed to unlink child locations" });
    }
  });

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

      const updates: { range: string; values: any[][] }[] = [];

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
    } catch (error: any) {
      console.error("Error setting head office:", error);
      res.status(500).json({ message: error.message || "Failed to set head office" });
    }
  });

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
    } catch (error: any) {
      console.error("Error getting child locations:", error);
      res.status(500).json({ message: error.message || "Failed to get child locations" });
    }
  });

}
