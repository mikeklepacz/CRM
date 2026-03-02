import type { Express } from "express";
import type { ApolloCoreRouteDeps } from "./apolloCore.types";
import * as apolloService from "../../services/apolloService";

export function registerApolloSearchOrganizationsRoute(app: Express, deps: ApolloCoreRouteDeps): void {
  app.post("/api/apollo/search/organizations", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const { domains, name, locations, employeeRanges, page, perPage } = req.body;
          const result = await apolloService.searchOrganizations({
              domains,
              name,
              locations,
              employeeRanges,
              page,
              perPage,
          });
          res.json(result);
      }
      catch (error: any) {
          console.error("Error searching Apollo organizations:", error);
          res.status(500).json({ message: error.message || "Failed to search organizations" });
      }
  });
}
