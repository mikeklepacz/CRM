import type { Express } from "express";
import type { StoreDiscoveryRouteDeps } from "./storeDiscovery.types";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

export function registerStoreDiscoveryByDbaRoute(app: Express, deps: StoreDiscoveryRouteDeps): void {
  app.get("/api/stores/by-dba/:sheetId/:dbaName", deps.isAuthenticatedCustom, async (req: any, res) => {
      try {
          const { sheetId, dbaName } = req.params;
          const sheet = await storage.getGoogleSheetById(sheetId, req.user.tenantId);
          if (!sheet) {
              return res.status(404).json({ message: "Sheet not found" });
          }
          const range = `${sheet.sheetName}!A:ZZ`;
          const rows = await googleSheets.readSheetData(sheet.spreadsheetId, range);
          if (rows.length === 0) {
              return res.json([]);
          }
          const headers = rows[0];
          const nameIndex = headers.findIndex((h: string) => h.toLowerCase() === "name");
          const linkIndex = headers.findIndex((h: string) => h.toLowerCase() === "link");
          const cityIndex = headers.findIndex((h: string) => h.toLowerCase() === "city");
          const stateIndex = headers.findIndex((h: string) => h.toLowerCase() === "state");
          const addressIndex = headers.findIndex((h: string) => h.toLowerCase() === "address");
          const dbaIndex = headers.findIndex((h: string) => h.toLowerCase() === "dba");
          if (dbaIndex === -1) {
              return res.status(404).json({ message: "DBA column not found in Store Database" });
          }
          const stores = rows
              .slice(1)
              .filter((row: any[]) => {
              const rowDba = row[dbaIndex] || "";
              return rowDba.toLowerCase().trim() === dbaName.toLowerCase().trim();
          })
              .map((row: any[]) => ({
              name: nameIndex !== -1 ? row[nameIndex] || "" : "",
              link: linkIndex !== -1 ? row[linkIndex] || "" : "",
              city: cityIndex !== -1 ? row[cityIndex] || "" : "",
              state: stateIndex !== -1 ? row[stateIndex] || "" : "",
              address: addressIndex !== -1 ? row[addressIndex] || "" : "",
          }))
              .filter((store: any) => store.link);
          res.json(stores);
      }
      catch (error: any) {
          console.error("Error fetching stores by DBA:", error);
          res.status(500).json({ message: error.message || "Failed to fetch stores by DBA" });
      }
  });
}
