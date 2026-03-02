import type { Express } from "express";
import type { ApolloCoreRouteDeps } from "./apolloCore.types";
import { getScopedContactsForCompany, getScopedEnrichedCompanies } from "../../services/apolloScopeService";
import { resolveTenantProjectId } from "../../services/projectScopeValidation";

export function registerApolloCompaniesListRoute(app: Express, deps: ApolloCoreRouteDeps): void {
  app.get("/api/apollo/companies", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const tenantId = await deps.getEffectiveTenantId(req);
          if (!tenantId) {
              return res.status(400).json({ message: "No tenant associated with user" });
          }
          const requestedProjectId = req.query.projectId as string | undefined;
          const projectId = await resolveTenantProjectId(tenantId, requestedProjectId);
          const companies = await getScopedEnrichedCompanies(tenantId, projectId);
          res.set("Cache-Control", "no-store");
          res.json(companies);
      }
      catch (error: any) {
          console.error("Error getting enriched companies:", error);
          res.status(500).json({ message: error.message || "Failed to get enriched companies" });
      }
  });
}
