import type { Express } from "express";
import { storage } from "../../storage";
import type { SalesExclusionsDeps } from "./exclusions.types";

export function registerExclusionsListByTypeRoute(app: Express, deps: SalesExclusionsDeps): void {
  app.get("/api/exclusions/:type", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { type } = req.params;
      if (type !== "keyword" && type !== "place_type") {
        return res.status(400).json({ message: 'Invalid type. Must be "keyword" or "place_type"' });
      }

      const projectId = req.query.projectId as string | undefined;
      const exclusions = await storage.getSavedExclusionsByType(req.user.tenantId, projectId, type);
      res.json({ exclusions });
    } catch (error: any) {
      console.error("Error fetching exclusions by type:", error);
      res.status(500).json({ message: error.message || "Failed to fetch exclusions" });
    }
  });
}
