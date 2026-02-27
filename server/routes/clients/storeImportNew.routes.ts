import type { Express } from "express";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import type { StoreManualMatchingDeps } from "./storeManualMatching.types";

export function registerStoreImportNewRoute(app: Express, deps: StoreManualMatchingDeps): void {
  app.post("/api/stores/import-new", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { store, sheetId } = req.body;

      if (!store) {
        return res.status(400).json({ message: "Store data is required" });
      }

      const sheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);
      const sheet = sheets.find((s) => s.id === sheetId);

      if (!sheet) {
        return res.status(404).json({ message: "Sheet not found" });
      }

      const rows = await googleSheets.readSheetData(sheet.spreadsheetId, `${sheet.sheetName}!A:ZZ`);

      if (rows.length === 0) {
        return res.status(400).json({ message: "Sheet is empty - cannot determine columns" });
      }

      const allHeaders = rows[0];
      const headers = allHeaders.filter((h) => h && h.trim() !== "");
      const nameIndex = headers.findIndex((h: string) => h.toLowerCase() === "store name");
      const addressIndex = headers.findIndex((h: string) => h.toLowerCase() === "address");
      const cityIndex = headers.findIndex((h: string) => h.toLowerCase() === "city");
      const stateIndex = headers.findIndex((h: string) => h.toLowerCase() === "state");
      const phoneIndex = headers.findIndex((h: string) => h.toLowerCase() === "phone");
      const zipIndex = headers.findIndex((h: string) => h.toLowerCase() === "zip code");
      const linkIndex = headers.findIndex((h: string) => h.toLowerCase() === "link");

      const { v4: uuidv4 } = await import("uuid");
      const newLink = uuidv4();

      const newRow = new Array(headers.length).fill("");
      if (nameIndex >= 0) newRow[nameIndex] = store.name || "";
      if (addressIndex >= 0) newRow[addressIndex] = store.address || "";
      if (cityIndex >= 0) newRow[cityIndex] = store.city || "";
      if (stateIndex >= 0) newRow[stateIndex] = store.state || "";
      if (phoneIndex >= 0) newRow[phoneIndex] = store.phone || "";
      if (zipIndex >= 0 && store.zip) newRow[zipIndex] = store.zip;
      if (linkIndex >= 0) newRow[linkIndex] = newLink;

      await googleSheets.appendSheetData(sheet.spreadsheetId, `${sheet.sheetName}!A:ZZ`, [newRow]);

      res.json({ success: true, link: newLink, message: "Store imported successfully" });
    } catch (error: any) {
      console.error("Error importing new store:", error);
      res.status(500).json({ message: error.message || "Failed to import store" });
    }
  });
}
