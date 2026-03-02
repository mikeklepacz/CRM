import type { Express } from "express";
import { storage } from "../../storage";
import type { SheetsCatalogDeps } from "./sheetsCatalog.types";

export function registerSheetsDisconnectRoute(app: Express, deps: SheetsCatalogDeps): void {
  app.post("/api/sheets/:id/disconnect", deps.isAuthenticatedCustom, deps.isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.disconnectGoogleSheet(id);
      res.json({ message: "Sheet disconnected successfully" });
    } catch (error: any) {
      console.error("Error disconnecting sheet:", error);
      res.status(500).json({ message: error.message || "Failed to disconnect sheet" });
    }
  });
}
