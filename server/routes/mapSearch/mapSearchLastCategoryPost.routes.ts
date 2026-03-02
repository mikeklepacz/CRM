import type { Express } from "express";
import { storage } from "../../storage";
import type { MapSearchPreferencesDeps } from "./preferences.types";

export function registerMapSearchLastCategoryPostRoute(app: Express, deps: MapSearchPreferencesDeps): void {
  app.post("/api/maps/last-category", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const { category } = req.body;

      if (!category) {
        return res.status(400).json({ message: "Category is required" });
      }

      await storage.setLastCategory(userId, tenantId, category);
      res.json({ message: "Last category saved successfully", category });
    } catch (error: any) {
      console.error("Error saving last category:", error);
      res.status(500).json({ message: error.message || "Failed to save last category" });
    }
  });
}
