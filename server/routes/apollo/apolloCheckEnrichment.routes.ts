import type { Express } from "express";
import * as apolloService from "../../services/apolloService";
import type { ApolloPrescreenDeps } from "./apolloPrescreen.types";
import { resolveTenantProjectId } from "../../services/projectScopeValidation";

export function registerApolloCheckEnrichmentRoute(app: Express, deps: ApolloPrescreenDeps): void {
  app.post("/api/apollo/check-enrichment", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }
      const { links, projectId: requestedProjectId } = req.body;
      if (!Array.isArray(links)) {
        return res.status(400).json({ message: "links must be an array" });
      }
      const projectId = await resolveTenantProjectId(tenantId, requestedProjectId);
      const result = await apolloService.bulkCheckEnrichmentStatus(tenantId, links, projectId);
      res.json(result);
    } catch (error: any) {
      console.error("Error checking enrichment status:", error);
      res.status(500).json({ message: error.message || "Failed to check enrichment status" });
    }
  });
}
