import type { Express } from "express";
import { storage } from "../../storage";
import type { SheetsCatalogDeps } from "./sheetsCatalog.types";

export function registerSheetsActiveRoute(app: Express, deps: SheetsCatalogDeps): void {
  app.get("/api/sheets/active", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const sheets = await storage.getAllActiveGoogleSheets(req.user.tenantId);
      res.json(sheets.length > 0 ? sheets[0] : null);
    } catch (error: any) {
      console.error("Error getting active sheets:", error);
      res.status(500).json({ message: error.message || "Failed to get active sheets" });
    }
  });
}
