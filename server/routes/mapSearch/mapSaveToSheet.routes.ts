import type { Express } from "express";
import { saveMapPlaceToStoreSheet } from "../../services/mapSearch/saveActionsService";
import type { MapSearchSaveActionsDeps } from "./saveActions.types";

export function registerMapSaveToSheetRoute(app: Express, deps: MapSearchSaveActionsDeps): void {
  app.post("/api/maps/save-to-sheet", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { placeId, category, projectId } = req.body;
      if (!placeId) {
        return res.status(400).json({ message: "Place ID is required" });
      }

      const payload = await saveMapPlaceToStoreSheet({
        placeId,
        tenantId: req.user.tenantId,
        category,
        projectId,
      });
      res.json(payload);
    } catch (error: any) {
      if (error.message === "Place not found") {
        return res.status(404).json({ message: "Place not found" });
      }
      if (error.message === "Category or valid projectId is required") {
        return res.status(400).json({ message: error.message });
      }
      if (error.message === "Store Database sheet not found. Please connect a Google Sheet first.") {
        return res.status(404).json({ message: error.message });
      }
      console.error("Error saving place to sheet:", error);
      res.status(500).json({ message: error.message || "Failed to save place to sheet" });
    }
  });
}
