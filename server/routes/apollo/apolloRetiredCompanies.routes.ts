import type { Express } from "express";
import { listRetiredApolloCompanies } from "../../services/apolloManagementService";
import type { ApolloManagementDeps } from "./apolloManagement.types";

export function registerApolloRetiredCompaniesRoute(app: Express, deps: ApolloManagementDeps): void {
  app.get("/api/apollo/companies/retired", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const projectId = req.query.projectId as string | undefined;
      const companies = await listRetiredApolloCompanies(tenantId, projectId);
      res.json(companies);
    } catch (error: any) {
      console.error("Error getting retired Apollo companies:", error);
      res.status(500).json({ message: error.message || "Failed to get retired companies" });
    }
  });
}
