import type { Express } from "express";
import type { ApolloCoreRouteDeps } from "./apolloCore.types";
import * as apolloService from "../../services/apolloService";
import { parseApolloOrganizationId } from "./apolloCore.helpers";
import { resolveTenantProjectId } from "../../services/projectScopeValidation";

function toPrescreenPeoplePreview(people: any[] | undefined) {
  return (people || []).slice(0, 5).map((person) => ({
    id: person.id,
    firstName: person.first_name || null,
    lastName: person.last_name || null,
    title: person.title || null,
    seniority: person.seniority || null,
    hasEmail: !!person.has_email,
    linkedinUrl: person.linkedin_url || null,
  }));
}

export function registerApolloPreviewRoute(app: Express, deps: ApolloCoreRouteDeps): void {
  app.post("/api/apollo/preview", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const tenantId = await deps.getEffectiveTenantId(req);
          if (!tenantId) {
              return res.status(400).json({ message: "No tenant associated with user" });
          }
          const { domain, companyName, organizationId, apolloAccountUrl, googleSheetLink, projectId: requestedProjectId } = req.body;
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

          // Keep pre-screen data in sync with the latest preview payload when context is provided.
          if (googleSheetLink) {
              const projectId = await resolveTenantProjectId(tenantId, requestedProjectId);
              if (result.company) {
                  await apolloService.markCompanyPrescreened(
                      tenantId,
                      googleSheetLink,
                      result.company.id,
                      result.company.primary_domain || domain,
                      result.company.name || companyName,
                      result.totalContacts,
                      projectId,
                      result.company.website_url,
                      result.company.linkedin_url,
                      result.company.short_description,
                      result.company.keywords,
                      result.company.estimated_num_employees,
                      toPrescreenPeoplePreview(result.contacts),
                  );
              } else {
                  await apolloService.markCompanyNotFound(
                      tenantId,
                      googleSheetLink,
                      domain,
                      companyName,
                      projectId,
                  );
              }
          }
          res.json(result);
      }
      catch (error: any) {
          console.error("Error previewing Apollo contacts:", error);
          res.status(500).json({ message: error.message || "Failed to preview contacts" });
      }
  });
}
