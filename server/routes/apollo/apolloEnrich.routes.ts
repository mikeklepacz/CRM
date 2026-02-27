import type { Express } from "express";
import type { ApolloCoreRouteDeps } from "./apolloCore.types";
import * as apolloService from "../../services/apolloService";
import { parseApolloOrganizationId } from "./apolloCore.helpers";

export function registerApolloEnrichRoute(app: Express, deps: ApolloCoreRouteDeps): void {
  app.post("/api/apollo/enrich", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const tenantId = await deps.getEffectiveTenantId(req);
          if (!tenantId) {
              return res.status(400).json({ message: "No tenant associated with user" });
          }
          const { googleSheetLink, domain, companyName, organizationId, apolloAccountUrl, selectedPersonIds, projectId } = req.body;
          const effectiveOrganizationId = organizationId || parseApolloOrganizationId(apolloAccountUrl);
          if (!googleSheetLink) {
              return res.status(400).json({ message: "googleSheetLink is required" });
          }
          if (!domain && !companyName && !effectiveOrganizationId) {
              return res.status(400).json({ message: "One of domain, companyName, or organizationId is required" });
          }
          const result = await apolloService.enrichAndStoreCompany({
              tenantId,
              projectId,
              googleSheetLink,
              domain,
              companyName,
              organizationId: effectiveOrganizationId,
              selectedPersonIds,
          });
          res.json(result);
      }
      catch (error: any) {
          console.error("Error enriching company:", error);
          res.status(500).json({ message: error.message || "Failed to enrich company" });
      }
  });
}
