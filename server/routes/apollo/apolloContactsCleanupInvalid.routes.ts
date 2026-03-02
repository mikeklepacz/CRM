import type { Express } from "express";
import { cleanupInvalidApolloContacts } from "../../services/apolloManagementService";
import { resolveTenantProjectId } from "../../services/projectScopeValidation";
import type { ApolloManagementDeps } from "./apolloManagement.types";

export function registerApolloContactsCleanupInvalidRoute(app: Express, deps: ApolloManagementDeps): void {
  app.post("/api/apollo/contacts/cleanup-invalid", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const { companyId, projectId: requestedProjectId } = req.body || {};
      const projectId = await resolveTenantProjectId(tenantId, requestedProjectId);
      const deleted = await cleanupInvalidApolloContacts(tenantId, companyId, projectId);
      res.json({ deleted });
    } catch (error: any) {
      console.error("Error cleaning invalid Apollo contacts:", error);
      res.status(500).json({ message: error.message || "Failed to cleanup contacts" });
    }
  });
}
