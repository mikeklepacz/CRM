import type { Express } from "express";
import { storage } from "../../storage";
import type { SalesExclusionsDeps } from "./exclusions.types";

export function registerExclusionsDeleteRoute(app: Express, deps: SalesExclusionsDeps): void {
  app.delete("/api/exclusions/:id", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      await storage.deleteSavedExclusion(req.params.id);
      res.json({ message: "Exclusion deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting exclusion:", error);
      res.status(500).json({ message: error.message || "Failed to delete exclusion" });
    }
  });
}
