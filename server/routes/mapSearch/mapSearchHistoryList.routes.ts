import type { Express } from "express";
import { storage } from "../../storage";
import type { MapSearchPreferencesDeps } from "./preferences.types";

export function registerMapSearchHistoryListRoute(app: Express, deps: MapSearchPreferencesDeps): void {
  app.get("/api/maps/search-history", deps.isAuthenticatedCustom, async (_req: any, res) => {
    try {
      const history = await storage.getAllSearchHistory();
      res.json({ history });
    } catch (error: any) {
      console.error("Error fetching search history:", error);
      res.status(500).json({ message: error.message || "Failed to fetch search history" });
    }
  });
}
