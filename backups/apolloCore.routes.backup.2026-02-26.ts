import type { Express } from "express";
import * as apolloService from "../../services/apolloService";
import { getScopedContactsForCompany, getScopedEnrichedCompanies } from "../../services/apolloScopeService";

function parseApolloOrganizationId(apolloAccountUrl: string | undefined): string | undefined {
  if (typeof apolloAccountUrl !== "string") {
    return undefined;
  }

  return (
    apolloAccountUrl.match(/\/accounts\/([a-f0-9]{24})/i)?.[1] ||
    apolloAccountUrl.match(/^[a-f0-9]{24}$/i)?.[0]
  );
}

export function registerApolloCoreRoutes(
  app: Express,
  deps: {
    isAdmin: any;
    isAuthenticatedCustom: any;
    getEffectiveTenantId: (req: any) => Promise<string | undefined>;
  }
): void {
  app.get("/api/apollo/settings", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }
      const settings = await apolloService.getOrCreateSettings(tenantId);
      res.json(settings);
    } catch (error: any) {
      console.error("Error getting Apollo settings:", error);
      res.status(500).json({ message: error.message || "Failed to get Apollo settings" });
    }
  });

  app.patch("/api/apollo/settings", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }
      const { targetTitles, targetSeniorities, maxContactsPerCompany, autoEnrichOnAdd } = req.body;
      const updated = await apolloService.updateSettings(tenantId, {
        targetTitles,
        targetSeniorities,
        maxContactsPerCompany,
        autoEnrichOnAdd,
      });
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating Apollo settings:", error);
      res.status(500).json({ message: error.message || "Failed to update Apollo settings" });
    }
  });

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
    } catch (error: any) {
      console.error("Error searching Apollo organizations:", error);
      res.status(500).json({ message: error.message || "Failed to search organizations" });
    }
  });

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
    } catch (error: any) {
      console.error("Error searching Apollo people:", error);
      res.status(500).json({ message: error.message || "Failed to search people" });
    }
  });

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
    } catch (error: any) {
      console.error("Error previewing Apollo contacts:", error);
      res.status(500).json({ message: error.message || "Failed to preview contacts" });
    }
  });

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
    } catch (error: any) {
      console.error("Error enriching company:", error);
      res.status(500).json({ message: error.message || "Failed to enrich company" });
    }
  });

  app.get("/api/apollo/companies", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const projectId = req.query.projectId as string | undefined;
      const companies = await getScopedEnrichedCompanies(tenantId, projectId);
      res.set("Cache-Control", "no-store");
      res.json(companies);
    } catch (error: any) {
      console.error("Error getting enriched companies:", error);
      res.status(500).json({ message: error.message || "Failed to get enriched companies" });
    }
  });

  app.get("/api/apollo/companies/:companyId/contacts", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const tenantId = await deps.getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const projectId = req.query.projectId as string | undefined;
      const contacts = await getScopedContactsForCompany(tenantId, companyId, projectId);
      res.json(contacts);
    } catch (error: any) {
      console.error("Error getting company contacts:", error);
      res.status(500).json({ message: error.message || "Failed to get company contacts" });
    }
  });

  app.get("/api/apollo/contacts/by-link", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const { link } = req.query;
      if (!link || typeof link !== "string") {
        return res.status(400).json({ message: "link query parameter is required" });
      }

      const contacts = await apolloService.getContactsByLink(tenantId, link);
      res.json(contacts);
    } catch (error: any) {
      console.error("Error getting contacts by link:", error);
      res.status(500).json({ message: error.message || "Failed to get contacts by link" });
    }
  });
}
