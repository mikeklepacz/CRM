import type { Express } from "express";
import { runMapGridSearch } from "../../services/mapSearch/searchCoreService";
import type { MapSearchCoreDeps } from "./searchCore.types";
import { resolveTenantProjectId } from "../../services/projectScopeValidation";

export function registerMapSearchGridSearchRoute(app: Express, deps: MapSearchCoreDeps): void {
  app.post("/api/maps/grid-search", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { query, location, excludedKeywords, excludedTypes, category, projectId } = req.body;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      if (!location) {
        return res.status(400).json({ message: "Location is required for grid search" });
      }

      let resolvedProjectId: string | undefined;
      try {
        resolvedProjectId = await resolveTenantProjectId(tenantId, projectId as string | undefined);
      } catch (scopeError: any) {
        if (scopeError?.message !== "Invalid projectId for tenant") {
          throw scopeError;
        }
        if (projectId) {
          console.warn(`[MapGridSearch] Ignoring invalid projectId "${projectId}" for tenant ${tenantId}`);
        }
      }

      const payload = await runMapGridSearch({
        tenantId,
        query,
        location,
        excludedKeywords,
        excludedTypes,
        category,
        projectId: resolvedProjectId,
      });
      res.json(payload);
    } catch (error: any) {
      console.error("Error in grid search:", error);
      res.status(500).json({ message: error.message || "Failed to perform grid search" });
    }
  });
}
