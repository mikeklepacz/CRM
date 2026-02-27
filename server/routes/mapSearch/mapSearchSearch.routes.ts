import type { Express } from "express";
import { runMapSearch } from "../../services/mapSearch/searchCoreService";
import type { MapSearchCoreDeps } from "./searchCore.types";

export function registerMapSearchSearchRoute(app: Express, deps: MapSearchCoreDeps): void {
  app.post("/api/maps/search", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { query, location, excludedKeywords, excludedTypes, category, pageToken } = req.body;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const payload = await runMapSearch({
        tenantId: req.user?.tenantId,
        query,
        location,
        excludedKeywords,
        excludedTypes,
        category,
        pageToken,
      });
      res.json(payload);
    } catch (error: any) {
      console.error("Error searching places:", error);
      res.status(500).json({ message: error.message || "Failed to search places" });
    }
  });
}
