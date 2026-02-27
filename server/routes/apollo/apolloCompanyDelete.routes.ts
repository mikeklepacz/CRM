import type { Express } from "express";
import { deleteApolloCompanyById } from "../../services/apolloManagementService";
import type { ApolloManagementDeps } from "./apolloManagement.types";

export function registerApolloCompanyDeleteRoute(app: Express, deps: ApolloManagementDeps): void {
  app.delete("/api/apollo/companies/:companyId", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const ok = await deleteApolloCompanyById(tenantId, req.params.companyId);
      if (!ok) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting Apollo company:", error);
      res.status(500).json({ message: error.message || "Failed to delete company" });
    }
  });
}
