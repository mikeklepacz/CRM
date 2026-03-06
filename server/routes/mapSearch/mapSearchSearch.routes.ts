import type { Express } from "express";
import { runMapSearch } from "../../services/mapSearch/searchCoreService";
import type { MapSearchCoreDeps } from "./searchCore.types";
import { resolveTenantProjectId } from "../../services/projectScopeValidation";

export function registerMapSearchSearchRoute(app: Express, deps: MapSearchCoreDeps): void {
  app.post("/api/maps/search", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { query, location, excludedKeywords, excludedTypes, category, pageToken, projectId } = req.body;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      let resolvedProjectId: string | undefined;
      try {
        resolvedProjectId = await resolveTenantProjectId(tenantId, projectId as string | undefined);
      } catch (scopeError: any) {
        if (scopeError?.message !== "Invalid projectId for tenant") {
          throw scopeError;
        }
        if (projectId) {
          console.warn(`[MapSearch] Ignoring invalid projectId "${projectId}" for tenant ${tenantId}`);
        }
      }

      const payload = await runMapSearch({
        tenantId,
        query,
        location,
        excludedKeywords,
        excludedTypes,
        category,
        pageToken,
        projectId: resolvedProjectId,
      });
      res.json(payload);
    } catch (error: any) {
      console.error("Error searching places:", error);
      res.status(500).json({ message: error.message || "Failed to search places" });
    }
  });
}
