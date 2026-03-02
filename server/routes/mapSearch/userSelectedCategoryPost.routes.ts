import type { Express } from "express";
import { storage } from "../../storage";
import type { MapSearchPreferencesDeps } from "./preferences.types";

export function registerUserSelectedCategoryPostRoute(app: Express, deps: MapSearchPreferencesDeps): void {
  app.post("/api/user/selected-category", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const { category } = req.body;

      if (!category) {
        return res.status(400).json({ message: "Category is required" });
      }

      await storage.setSelectedCategory(userId, tenantId, category);
      res.json({ message: "Selected category saved successfully", category });
    } catch (error: any) {
      console.error("Error saving selected category:", error);
      res.status(500).json({ message: error.message || "Failed to save selected category" });
    }
  });
}
