import type { Express } from "express";
import * as googleMaps from "../../googleMaps";
import type { MapSearchCoreDeps } from "./searchCore.types";

export function registerMapSearchPlaceDetailsRoute(app: Express, deps: MapSearchCoreDeps): void {
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
}
