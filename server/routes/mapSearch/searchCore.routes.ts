import type { Express } from "express";
import * as googleMaps from "../../googleMaps";
import { findDuplicateWebsites, runMapGridSearch, runMapSearch } from "../../services/mapSearch/searchCoreService";

type Deps = {
  isAuthenticatedCustom: any;
};

export function registerMapSearchCoreRoutes(app: Express, deps: Deps): void {
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

  app.get("/api/maps/place/:placeId", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { placeId } = req.params;
      if (!placeId) {
        return res.status(400).json({ message: "Place ID is required" });
      }

      const details = await googleMaps.getPlaceDetails(placeId);
      if (!details) {
        return res.status(404).json({ message: "Place not found" });
      }
      res.json({ place: details });
    } catch (error: any) {
      console.error("Error fetching place details:", error);
      res.status(500).json({ message: error.message || "Failed to fetch place details" });
    }
  });

  app.post("/api/maps/reverse-geocode", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { lat, lng } = req.body;
      if (lat === undefined || lng === undefined) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }

      const result = await googleMaps.reverseGeocode(lat, lng);
      if (!result) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error reverse geocoding:", error);
      res.status(500).json({ message: error.message || "Failed to reverse geocode location" });
    }
  });

  app.post("/api/maps/check-duplicates", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { websites } = req.body as { websites: string[] };
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }
      if (!websites || !Array.isArray(websites) || websites.length === 0) {
        return res.json({ duplicates: [] });
      }

      const duplicates = await findDuplicateWebsites(tenantId, websites);
      res.json({ duplicates });
    } catch (error: any) {
      console.error("Error checking duplicates:", error);
      res.status(500).json({ message: error.message || "Failed to check duplicates" });
    }
  });
}
