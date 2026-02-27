import type { Express } from "express";
import { storage } from "../../storage";
import type { SalesExclusionsDeps } from "./exclusions.types";

export function registerExclusionsListRoute(app: Express, deps: SalesExclusionsDeps): void {
  app.get("/api/exclusions", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const exclusions = await storage.getAllSavedExclusions(req.user.tenantId, projectId);
      res.json({ exclusions });
    } catch (error: any) {
      console.error("Error fetching exclusions:", error);
      res.status(500).json({ message: error.message || "Failed to fetch exclusions" });
    }
  });
}
