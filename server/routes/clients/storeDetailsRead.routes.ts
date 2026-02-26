import type { Express } from "express";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

type Deps = {
  isAuthenticatedCustom: any;
};

export function registerStoreDetailsReadRoutes(app: Express, deps: Deps): void {
  app.get("/api/store/:storeId", deps.isAuthenticatedCustom, async (req: any, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { storeId } = req.params;
      const decodedId = decodeURIComponent(storeId);

      const sheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);
      const storeSheet = sheets.find((s) => s.sheetPurpose === "Store Database");
      const trackerSheet = sheets.find((s) => s.sheetPurpose === "commissions");

      if (!storeSheet) {
        return res.status(404).json({ message: "Store sheet not found" });
      }

      const storeRange = `${storeSheet.sheetName}!A:ZZ`;
      const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);

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

      const store = storeData.find((row: any) => row.link === decodedId);
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      if (trackerSheet) {
        const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
        const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

        if (trackerRows.length > 0) {
          const trackerHeaders = trackerRows[0];
          const trackerData = trackerRows.slice(1).map((row) => {
            const obj: any = {};
            trackerHeaders.forEach((header, i) => {
              obj[header] = row[i] || "";
            });
            return obj;
          });

          const linkIndex = trackerHeaders.findIndex((h) => h.toLowerCase() === "link");
          const trackerRow = trackerData.find((row: any) => {
            if (linkIndex !== -1) {
              const rowLink = row[trackerHeaders[linkIndex]];
              return rowLink && rowLink === decodedId;
            }
            return row.link === decodedId || row.Link === decodedId;
          });

          if (trackerRow) {
            trackerHeaders.forEach((header) => {
              const value = trackerRow[header];
              if (value) {
                store[header] = value;

                const lowerHeader = header.toLowerCase();
                if (lowerHeader === "notes") store.Notes = value;
                else if (lowerHeader === "point of contact") store["Point of Contact"] = value;
                else if (lowerHeader === "poc email") store["POC Email"] = value;
                else if (lowerHeader === "poc phone") store["POC Phone"] = value;
              }
            });
          }
        }
      }

      res.json(store);
    } catch (error) {
      console.error("Error fetching store details:", error);
      next(error);
    }
  });
}
