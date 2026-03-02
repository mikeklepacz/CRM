import * as apolloService from "../../services/apolloService";
import { extractDomain } from "./apolloPrescreen.helpers";
import { resolveTenantProjectId } from "../../services/projectScopeValidation";

export async function handleApolloBulkPrescreen(
  req: any,
  res: any,
  getEffectiveTenantId: (req: any) => Promise<string | undefined>
) {
  try {
    const tenantId = await getEffectiveTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant associated with user" });
    }

    const { contacts, projectId: requestedProjectId } = req.body;
    if (!Array.isArray(contacts)) {
      return res.status(400).json({ message: "contacts must be an array" });
    }

    const projectId = await resolveTenantProjectId(tenantId, requestedProjectId);

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
            projectId,
            preview.company.website_url,
            preview.company.short_description,
            preview.company.keywords
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
}
