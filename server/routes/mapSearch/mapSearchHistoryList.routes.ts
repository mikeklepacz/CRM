import type { Express } from "express";
import { storage } from "../../storage";
import type { MapSearchPreferencesDeps } from "./preferences.types";
import { resolveTenantProjectId } from "../../services/projectScopeValidation";

export function registerMapSearchHistoryListRoute(app: Express, deps: MapSearchPreferencesDeps): void {
  app.get("/api/maps/search-history", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const requestedProjectId = req.query.projectId as string | undefined;
      let projectId: string | undefined;
      try {
        projectId = await resolveTenantProjectId(tenantId, requestedProjectId);
      } catch (scopeError: any) {
        if (scopeError?.message !== "Invalid projectId for tenant") {
          throw scopeError;
        }
        if (requestedProjectId) {
          console.warn(`[MapSearchHistory] Ignoring invalid projectId "${requestedProjectId}" for tenant ${tenantId}`);
        }
      }

      const history = await storage.getAllSearchHistory(tenantId, projectId);
      res.json({ history });
    } catch (error: any) {
      console.error("Error fetching search history:", error);
      res.status(500).json({ message: error.message || "Failed to fetch search history" });
    }
  });
}
