import type { Express } from "express";
import { storage } from "../../storage";
import type { MapSearchPreferencesDeps } from "./preferences.types";

export function registerUserActiveExclusionsUpdateRoute(app: Express, deps: MapSearchPreferencesDeps): void {
  app.put("/api/user/active-exclusions", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { activeKeywords = [], activeTypes = [] } = req.body;
      const preferences = await storage.updateUserActiveExclusions(
        userId,
        req.user.tenantId,
        activeKeywords,
        activeTypes
      );
      res.json({ preferences });
    } catch (error: any) {
      console.error("Error updating active exclusions:", error);
      res.status(500).json({ message: error.message || "Failed to update active exclusions" });
    }
  });
}
