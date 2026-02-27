import type { Express } from "express";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import type { SheetsCatalogDeps } from "./sheetsCatalog.types";

export function registerSheetsRefreshRoute(app: Express, deps: SheetsCatalogDeps): void {
  app.post("/api/sheets/refresh", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      const sheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);
      const trackerSheet = sheets.find((s) => s.sheetPurpose === "commissions");

      if (trackerSheet) {
        const syncResult = await googleSheets.syncCommissionTrackerToPostgres(trackerSheet.id, req.user.tenantId);
        console.log("📊 Sync result:", syncResult);
      } else {
        console.log("⚠️ No Commission Tracker sheet found, skipping sync");
      }

      deps.clearUserCache(userId);
      res.json({ message: "Sync completed and cache cleared successfully" });
    } catch (error: any) {
      console.error("Error during refresh:", error);
      res.status(500).json({ message: error.message || "Failed to refresh data" });
    }
  });
}
