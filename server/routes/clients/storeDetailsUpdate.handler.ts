import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import { buildSheetRange } from "../../services/sheets/a1Range";
import { findStoreSheetRowByLink } from "../../services/sheets/storeDatabaseResolver";

type Deps = {
  isAuthenticatedCustom: any;
};

export function buildStoreDetailsUpdateHandler(_deps: Deps) {
  return async (req: any, res: any, next: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { storeId } = req.params;
      const updates = req.body;
      const projectId = typeof req.query?.projectId === "string" ? req.query.projectId : undefined;

      const sheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);
      const storeMatch = await findStoreSheetRowByLink({
        tenantId: req.user.tenantId,
        link: decodeURIComponent(storeId),
        projectId,
        preferProjectMatch: true,
      });
      const storeSheet = storeMatch?.sheet || null;

      if (!storeSheet) {
        return res.status(404).json({ message: "Store sheet not found" });
      }

      const decodedId = decodeURIComponent(storeId);
      const storeRows = storeMatch?.rows || [];

      if (storeRows.length === 0) {
        return res.status(404).json({ message: "Store sheet is empty" });
      }

      const storeHeaders = storeRows[0];
      const storeData = storeRows.slice(1).map((row, index) => {
        const obj: any = { _storeRowIndex: index + 2 };
        storeHeaders.forEach((header, i) => {
          obj[header] = row[i] || "";
        });
        return obj;
      });

      const store = storeData.find((row: any) => row._storeRowIndex === storeMatch?.rowIndex);
      if (!store || !store._storeRowIndex) {
        return res.status(404).json({ message: "Store not found or has no row index" });
      }

      const storeColumnMapping: Record<string, string> = {
        name: "name",
        type: "type",
        link: "link",
        about: "about",
        member_since: "Member Since",
        address: "Address",
        city: "City",
        state: "State",
        phone: "Phone",
        website: "Website",
        email: "Email",
        followers: "Followers",
        hours: "Hours",
        vibe_score: "Vibe Score",
        sales_ready_summary: "Sales-ready Summary",
        dba: "DBA",
        agent_name: "Agent Name",
      };

      const trackerColumnMapping: Record<string, string> = {
        notes: "Notes",
        point_of_contact: "Point of Contact",
        poc_email: "POC Email",
        poc_phone: "POC Phone",
      };

      const storeBatchUpdates: { range: string; values: any[][] }[] = [];

      Object.entries(updates).forEach(([field, value]) => {
        const columnName = storeColumnMapping[field];
        if (columnName) {
            const columnIndex = storeHeaders.findIndex((h) => h.toLowerCase() === columnName.toLowerCase());
            if (columnIndex !== -1) {
              const columnLetter = String.fromCharCode(65 + columnIndex);
              storeBatchUpdates.push({
              range: buildSheetRange(storeSheet.sheetName, `${columnLetter}${store._storeRowIndex}`),
                values: [[value]],
              });
            }
        }
      });

      if (storeBatchUpdates.length > 0) {
        for (const update of storeBatchUpdates) {
          await googleSheets.writeSheetData(storeSheet.spreadsheetId, update.range, update.values);
        }
      }

      const trackerSheet = sheets.find((s) => s.sheetPurpose === "commissions");

      if (trackerSheet) {
        const currentUser = await storage.getUser(userId);

        if (currentUser && currentUser.agentName) {
          const trackerRange = buildSheetRange(trackerSheet.sheetName, "A:ZZ");
          const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

          if (trackerRows.length > 0) {
            const allTrackerHeaders = trackerRows[0];
            const trackerHeaders = allTrackerHeaders.filter((h) => h && h.trim() !== "");
            const trackerData = trackerRows.slice(1).map((row, index) => {
              const obj: any = { _trackerRowIndex: index + 2 };
              trackerHeaders.forEach((header, i) => {
                obj[header] = row[i] || "";
              });
              return obj;
            });

            const linkIndex = trackerHeaders.findIndex((h) => h.toLowerCase() === "link");
            const agentNameIndex = trackerHeaders.findIndex((h) => h.toLowerCase() === "agent name");
            const statusIndex = trackerHeaders.findIndex((h) => h.toLowerCase() === "status");

            const trackerRow = trackerData.find((row: any) => {
              if (linkIndex !== -1) {
                const rowLink = row[trackerHeaders[linkIndex]];
                return rowLink && rowLink === decodedId;
              }
              return row.link === decodedId || row.Link === decodedId;
            });

            let rowIndex = trackerRow?._trackerRowIndex;

            if (!trackerRow) {
              console.log("[AUTO-CLAIM] Creating tracker row for unclaimed store:", decodedId);

              const newRow = new Array(trackerHeaders.length).fill("");
              if (linkIndex !== -1) {
                newRow[linkIndex] = decodedId;
              }
              if (agentNameIndex !== -1) {
                newRow[agentNameIndex] = currentUser.agentName;
              }
              if (statusIndex !== -1) {
                newRow[statusIndex] = "Claimed";
              }

              const safeAppendRange = buildSheetRange(trackerSheet.sheetName, "A:ZZ");
              const response = await googleSheets.appendSheetData(
                trackerSheet.spreadsheetId,
                safeAppendRange,
                [newRow]
              );

              const updatedRange = response.updates?.updatedRange;
              if (updatedRange) {
                const match = updatedRange.match(/!([A-Z]+)(\d+):/);
                if (match) {
                  rowIndex = parseInt(match[2], 10);
                  console.log("[AUTO-CLAIM] Created tracker row at index:", rowIndex);
                }
              }
            }

            const trackerFields = Object.keys(trackerColumnMapping);
            const hasTrackerUpdates = trackerFields.some((field) => field in updates);

            if (hasTrackerUpdates && rowIndex) {
              const trackerBatchUpdates: { range: string; values: any[][] }[] = [];

              Object.entries(updates).forEach(([field, value]) => {
                const columnName = trackerColumnMapping[field];
                if (columnName) {
                    const columnIndex = trackerHeaders.findIndex((h) => h.toLowerCase() === columnName.toLowerCase());
                    if (columnIndex !== -1) {
                      const columnLetter = String.fromCharCode(65 + columnIndex);
                      trackerBatchUpdates.push({
                      range: buildSheetRange(trackerSheet.sheetName, `${columnLetter}${rowIndex}`),
                        values: [[value]],
                      });
                    }
                }
              });

              if (trackerBatchUpdates.length > 0) {
                for (const update of trackerBatchUpdates) {
                  await googleSheets.writeSheetData(trackerSheet.spreadsheetId, update.range, update.values);
                }
              }
            }
          }
        }
      }

      res.json({ success: true, message: "Store updated successfully" });
    } catch (error) {
      console.error("Error updating store details:", error);
      next(error);
    }
  };
}
