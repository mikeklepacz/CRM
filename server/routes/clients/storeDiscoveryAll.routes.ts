import type { Express } from "express";
import type { StoreDiscoveryRouteDeps } from "./storeDiscovery.types";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

export function registerStoreDiscoveryAllRoute(app: Express, deps: StoreDiscoveryRouteDeps): void {
  app.get("/api/stores/all/:sheetId", deps.isAuthenticatedCustom, async (req: any, res) => {
      try {
          const { sheetId } = req.params;
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
          const openIndex = headers.findIndex((h: string) => h.toLowerCase() === "open");
          const stores = rows
              .slice(1)
              .map((row: any[]) => ({
              name: nameIndex !== -1 ? row[nameIndex] || "" : "",
              link: linkIndex !== -1 ? row[linkIndex] || "" : "",
              city: cityIndex !== -1 ? row[cityIndex] || "" : "",
              state: stateIndex !== -1 ? row[stateIndex] || "" : "",
              address: addressIndex !== -1 ? row[addressIndex] || "" : "",
              open: openIndex !== -1 ? row[openIndex] || "" : "",
          }))
              .filter((store: any) => {
              if (!store.link)
                  return false;
              if (store.open && store.open.toLowerCase().trim() === "false")
                  return false;
              return true;
          });
          res.json(stores);
      }
      catch (error: any) {
          console.error("Error fetching all stores:", error);
          res.status(500).json({ message: error.message || "Failed to fetch stores" });
      }
  });
}
