import type { Express } from "express";
import type { ApolloCoreRouteDeps } from "./apolloCore.types";
import * as apolloService from "../../services/apolloService";
import { parseApolloOrganizationId } from "./apolloCore.helpers";

export function registerApolloPreviewRoute(app: Express, deps: ApolloCoreRouteDeps): void {
  app.post("/api/apollo/preview", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const tenantId = await deps.getEffectiveTenantId(req);
          if (!tenantId) {
              return res.status(400).json({ message: "No tenant associated with user" });
          }
          const { domain, companyName, organizationId, apolloAccountUrl } = req.body;
          const effectiveOrganizationId = organizationId || parseApolloOrganizationId(apolloAccountUrl);
          if (!domain && !companyName && !effectiveOrganizationId) {
              return res.status(400).json({ message: "One of domain, companyName, or organizationId is required" });
          }
          const result = await apolloService.previewContactsForCompany({
              domain,
              companyName,
              organizationId: effectiveOrganizationId,
              tenantId,
          });
          res.json(result);
      }
      catch (error: any) {
          console.error("Error previewing Apollo contacts:", error);
          res.status(500).json({ message: error.message || "Failed to preview contacts" });
      }
  });
}
