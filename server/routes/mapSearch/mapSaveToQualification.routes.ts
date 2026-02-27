import type { Express } from "express";
import { saveMapPlaceToQualification } from "../../services/mapSearch/saveActionsService";
import type { MapSearchSaveActionsDeps } from "./saveActions.types";

export function registerMapSaveToQualificationRoute(app: Express, deps: MapSearchSaveActionsDeps): void {
  app.post("/api/maps/save-to-qualification", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { placeId, category, projectId } = req.body;
      if (!placeId) {
        return res.status(400).json({ message: "Place ID is required" });
      }

      const tenantId = req.user.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }

      const payload = await saveMapPlaceToQualification({
        placeId,
        tenantId,
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
      console.error("Error saving place to qualification leads:", error);
      res.status(500).json({ message: error.message || "Failed to save lead" });
    }
  });
}
