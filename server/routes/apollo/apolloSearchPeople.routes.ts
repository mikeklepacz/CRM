import type { Express } from "express";
import type { ApolloCoreRouteDeps } from "./apolloCore.types";
import * as apolloService from "../../services/apolloService";

export function registerApolloSearchPeopleRoute(app: Express, deps: ApolloCoreRouteDeps): void {
  app.post("/api/apollo/search/people", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const { organizationDomains, organizationIds, titles, seniorities, locations, emailStatus, page, perPage } = req.body;
          const result = await apolloService.searchPeople({
              organizationDomains,
              organizationIds,
              titles,
              seniorities,
              locations,
              emailStatus,
              page,
              perPage,
          });
          res.json(result);
      }
      catch (error: any) {
          console.error("Error searching Apollo people:", error);
          res.status(500).json({ message: error.message || "Failed to search people" });
      }
  });
}
