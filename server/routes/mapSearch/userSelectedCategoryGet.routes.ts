import type { Express } from "express";
import { storage } from "../../storage";
import type { MapSearchPreferencesDeps } from "./preferences.types";

export function registerUserSelectedCategoryGetRoute(app: Express, deps: MapSearchPreferencesDeps): void {
  app.get("/api/user/selected-category", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const selectedCategory = await storage.getSelectedCategory(userId, tenantId);
      res.json({ category: selectedCategory });
    } catch (error: any) {
      console.error("Error fetching selected category:", error);
      res.status(500).json({ message: error.message || "Failed to fetch selected category" });
    }
  });
}
