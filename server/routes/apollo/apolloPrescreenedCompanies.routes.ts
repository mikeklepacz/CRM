import type { Express } from "express";
import * as apolloService from "../../services/apolloService";
import type { ApolloPrescreenDeps } from "./apolloPrescreen.types";
import { resolveTenantProjectId } from "../../services/projectScopeValidation";

export function registerApolloPrescreenedCompaniesRoute(app: Express, deps: ApolloPrescreenDeps): void {
  app.get("/api/apollo/companies/prescreened", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }
      const requestedProjectId = req.query.projectId as string | undefined;
      const projectId = await resolveTenantProjectId(tenantId, requestedProjectId);
      const companies = await apolloService.getPrescreenedCompanies(tenantId, projectId);
      res.json(companies);
    } catch (error: any) {
      console.error("Error getting prescreened companies:", error);
      res.status(500).json({ message: error.message || "Failed to get prescreened companies" });
    }
  });
}
