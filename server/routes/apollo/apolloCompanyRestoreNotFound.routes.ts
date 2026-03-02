import type { Express } from "express";
import { restoreApolloCompanyToNotFound } from "../../services/apolloManagementService";
import type { ApolloManagementDeps } from "./apolloManagement.types";

export function registerApolloCompanyRestoreNotFoundRoute(app: Express, deps: ApolloManagementDeps): void {
  app.patch(
    "/api/apollo/companies/:companyId/restore-not-found",
    deps.isAuthenticatedCustom,
    deps.isAdmin,
    async (req: any, res) => {
      try {
        const tenantId = await deps.getEffectiveTenantId(req);
        if (!tenantId) {
          return res.status(400).json({ message: "No tenant associated with user" });
        }

        const ok = await restoreApolloCompanyToNotFound(tenantId, req.params.companyId);
        if (!ok) {
          return res.status(404).json({ message: "Company not found" });
        }
        res.json({ success: true });
      } catch (error: any) {
        console.error("Error restoring Apollo company to not_found:", error);
        res.status(500).json({ message: error.message || "Failed to restore company" });
      }
    }
  );
}
