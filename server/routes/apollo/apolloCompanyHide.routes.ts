import type { Express } from "express";
import { hideApolloCompanyById } from "../../services/apolloManagementService";
import type { ApolloManagementDeps } from "./apolloManagement.types";

export function registerApolloCompanyHideRoute(app: Express, deps: ApolloManagementDeps): void {
  app.patch("/api/apollo/companies/:companyId/hide", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const ok = await hideApolloCompanyById(tenantId, req.params.companyId);
      if (!ok) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error hiding Apollo company:", error);
      res.status(500).json({ message: error.message || "Failed to hide company" });
    }
  });
}
