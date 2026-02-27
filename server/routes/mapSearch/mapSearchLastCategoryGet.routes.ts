import type { Express } from "express";
import { storage } from "../../storage";
import type { MapSearchPreferencesDeps } from "./preferences.types";

export function registerMapSearchLastCategoryGetRoute(app: Express, deps: MapSearchPreferencesDeps): void {
  app.get("/api/maps/last-category", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const lastCategory = await storage.getLastCategory(userId, tenantId);
      res.json({ category: lastCategory || "Pets" });
    } catch (error: any) {
      console.error("Error fetching last category:", error);
      res.status(500).json({ message: error.message || "Failed to fetch last category" });
    }
  });
}
