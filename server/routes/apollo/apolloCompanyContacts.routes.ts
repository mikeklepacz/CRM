import type { Express } from "express";
import type { ApolloCoreRouteDeps } from "./apolloCore.types";
import { getScopedContactsForCompany, getScopedEnrichedCompanies } from "../../services/apolloScopeService";
import { resolveTenantProjectId } from "../../services/projectScopeValidation";

export function registerApolloCompanyContactsRoute(app: Express, deps: ApolloCoreRouteDeps): void {
  app.get("/api/apollo/companies/:companyId/contacts", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const { companyId } = req.params;
          const tenantId = await deps.getEffectiveTenantId(req);
          if (!tenantId) {
              return res.status(400).json({ message: "No tenant associated with user" });
          }
          const requestedProjectId = req.query.projectId as string | undefined;
          const projectId = await resolveTenantProjectId(tenantId, requestedProjectId);
          const contacts = await getScopedContactsForCompany(tenantId, companyId, projectId);
          res.json(contacts);
      }
      catch (error: any) {
          console.error("Error getting company contacts:", error);
          res.status(500).json({ message: error.message || "Failed to get company contacts" });
      }
  });
}
