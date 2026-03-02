import type { Express } from "express";
import { listCompanyContactsWithAutoCleanup } from "../../services/apolloManagementService";
import { resolveTenantProjectId } from "../../services/projectScopeValidation";
import type { ApolloManagementDeps } from "./apolloManagement.types";

export function registerApolloCompanyContactsCleanRoute(app: Express, deps: ApolloManagementDeps): void {
  app.get("/api/apollo/companies/:companyId/contacts-clean", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const requestedProjectId = req.query.projectId as string | undefined;
      const projectId = await resolveTenantProjectId(tenantId, requestedProjectId);
      const contacts = await listCompanyContactsWithAutoCleanup(tenantId, req.params.companyId, projectId);
      res.json(contacts);
    } catch (error: any) {
      console.error("Error getting cleaned company contacts:", error);
      res.status(500).json({ message: error.message || "Failed to get contacts" });
    }
  });
}
