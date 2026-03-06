import type { Express } from "express";
import { storage } from "../../storage";
import type { MapSearchPreferencesDeps } from "./preferences.types";

export function registerMapSearchHistoryDeleteRoute(app: Express, deps: MapSearchPreferencesDeps): void {
  app.delete("/api/maps/search-history/:id", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }
      await storage.deleteSearchHistory(id, tenantId);
      res.json({ message: "Search history entry deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting search history:", error);
      res.status(500).json({ message: error.message || "Failed to delete search history" });
    }
  });
}
