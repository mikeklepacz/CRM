import type { Express } from "express";
import { runMapGridSearch } from "../../services/mapSearch/searchCoreService";
import type { MapSearchCoreDeps } from "./searchCore.types";

export function registerMapSearchGridSearchRoute(app: Express, deps: MapSearchCoreDeps): void {
  app.post("/api/maps/grid-search", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { query, location, excludedKeywords, excludedTypes, category } = req.body;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      if (!location) {
        return res.status(400).json({ message: "Location is required for grid search" });
      }

      const payload = await runMapGridSearch({
        tenantId: req.user?.tenantId,
        query,
        location,
        excludedKeywords,
        excludedTypes,
        category,
      });
      res.json(payload);
    } catch (error: any) {
      console.error("Error in grid search:", error);
      res.status(500).json({ message: error.message || "Failed to perform grid search" });
    }
  });
}
