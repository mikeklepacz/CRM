import type { Express } from "express";
import * as apolloService from "../../services/apolloService";

function extractDomain(website: string | undefined): string | undefined {
  if (!website) {
    return undefined;
  }

  try {
    const parsed = new URL(website.startsWith("http") ? website : `https://${website}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return website.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
  }
}

export function registerApolloPrescreenRoutes(
  app: Express,
  deps: {
    isAdmin: any;
    isAuthenticatedCustom: any;
    getEffectiveTenantId: (req: any) => Promise<string | undefined>;
  }
): void {
  app.post("/api/apollo/check-enrichment", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }
      const { links } = req.body;
      if (!Array.isArray(links)) {
        return res.status(400).json({ message: "links must be an array" });
      }
      const result = await apolloService.bulkCheckEnrichmentStatus(tenantId, links);
      res.json(result);
    } catch (error: any) {
      console.error("Error checking enrichment status:", error);
      res.status(500).json({ message: error.message || "Failed to check enrichment status" });
    }
  });

  app.get("/api/apollo/companies/not-found", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }
      const projectId = req.query.projectId as string | undefined;
      const companies = await apolloService.getNotFoundCompanies(tenantId, projectId);
      res.json(companies);
    } catch (error: any) {
      console.error("Error getting not-found companies:", error);
      res.status(500).json({ message: error.message || "Failed to get not-found companies" });
    }
  });

  app.get("/api/apollo/companies/prescreened", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }
      const projectId = req.query.projectId as string | undefined;
      const companies = await apolloService.getPrescreenedCompanies(tenantId, projectId);
      res.json(companies);
    } catch (error: any) {
      console.error("Error getting prescreened companies:", error);
      res.status(500).json({ message: error.message || "Failed to get prescreened companies" });
    }
  });

  app.post("/api/apollo/bulk-prescreen", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const { contacts, projectId } = req.body;
      if (!Array.isArray(contacts)) {
        return res.status(400).json({ message: "contacts must be an array" });
      }

      const links = contacts.map((c: any) => c.link).filter(Boolean);
      const existingStatus = await apolloService.bulkCheckEnrichmentStatus(tenantId, links);

      let checked = 0;
      let found = 0;
      let notFound = 0;
      let skipped = 0;

      for (const contact of contacts) {
        if (!contact.link) continue;

        if (existingStatus[contact.link]) {
          skipped++;
          continue;
        }

        checked++;

        try {
          const domain = extractDomain(contact.website);
          const preview = await apolloService.previewContactsForCompany({
            domain,
            companyName: !domain ? contact.name : undefined,
            tenantId,
          });

          if (preview.company) {
            found++;
            await apolloService.markCompanyPrescreened(
              tenantId,
              contact.link,
              preview.company.id,
              preview.company.primary_domain || domain,
              preview.company.name || contact.name,
              preview.totalContacts,
              projectId
            );
          } else {
            notFound++;
            await apolloService.markCompanyNotFound(tenantId, contact.link, domain, contact.name, projectId);
          }
        } catch (error) {
          console.error(`Error prescreening contact ${contact.link}:`, error);
          notFound++;
          await apolloService.markCompanyNotFound(tenantId, contact.link, undefined, contact.name, projectId);
        }
      }

      res.json({ checked, found, notFound, skipped });
    } catch (error: any) {
      console.error("Error bulk prescreening:", error);
      res.status(500).json({ message: error.message || "Failed to bulk prescreen" });
    }
  });
}
