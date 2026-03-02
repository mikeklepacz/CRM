import type { Express } from "express";
import * as googleMaps from "../../googleMaps";
import type { MapSearchCoreDeps } from "./searchCore.types";

export function registerMapSearchReverseGeocodeRoute(app: Express, deps: MapSearchCoreDeps): void {
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
}
