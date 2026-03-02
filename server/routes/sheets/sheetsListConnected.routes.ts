import type { Express } from "express";
import { storage } from "../../storage";
import type { SheetsCatalogDeps } from "./sheetsCatalog.types";

export function registerSheetsListConnectedRoute(app: Express, deps: SheetsCatalogDeps): void {
  app.get("/api/sheets", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const sheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);
      res.json({ sheets });
    } catch (error: any) {
      console.error("Error fetching sheets:", error);
      res.status(500).json({ message: error.message || "Failed to fetch sheets" });
    }
  });
}
