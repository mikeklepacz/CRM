import { and, eq } from "drizzle-orm";
import { apolloCompanies, qualificationLeads, tenantProjects } from "@shared/schema";
import { db } from "../../db";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function buildApolloLeadDiscoveryHandler(deps: {
  getEffectiveTenantId: (req: any) => Promise<string | undefined>;
}) {
  return async (req: any, res: any) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const projectId = req.query.projectId as string | undefined;

      let allowedCategoryName: string | null = null;
      if (projectId) {
        const project = await db
          .select({ name: tenantProjects.name })
          .from(tenantProjects)
          .where(eq(tenantProjects.id, projectId))
          .limit(1);

        if (project.length === 0) {
          return res.json({ contacts: [] });
        }
        allowedCategoryName = project[0].name.toLowerCase().trim();
      }

      const alreadyEnrichedLinks = await db
        .select({ link: apolloCompanies.googleSheetLink })
        .from(apolloCompanies)
        .where(and(eq(apolloCompanies.tenantId, tenantId), eq(apolloCompanies.enrichmentStatus, "enriched")));
      const enrichedLinkSet = new Set(alreadyEnrichedLinks.map((r) => r.link));

      const storeSheet = await storage.getGoogleSheetByPurpose("Store Database", tenantId);

      let leadsWithoutEmails: Array<{
        name: string;
        email: string;
        state: string;
        link: string;
        website: string;
      }> = [];

      if (storeSheet) {
        const storeData = await googleSheets.readSheetData(storeSheet.spreadsheetId, `${storeSheet.sheetName}!A:ZZ`);

        if (storeData && storeData.length > 0) {
          const headers = storeData[0].map((h: string) => h.toLowerCase().trim());
          const rows = storeData.slice(1);

          const nameIndex = headers.indexOf("name");
          const emailIndex = headers.indexOf("email");
          const stateIndex = headers.indexOf("state");
          const linkIndex = headers.indexOf("link");
          const websiteIndex = headers.indexOf("website");
          const categoryIndex = headers.indexOf("category");

          leadsWithoutEmails = rows
            .filter((row: any[]) => {
              const email = emailIndex !== -1 ? (row[emailIndex] || "").trim() : "";
              if (email && email.includes("@")) {
                return false;
              }

              const link = linkIndex !== -1 ? (row[linkIndex] || "").trim() : "";
              if (!link) {
                return false;
              }

              if (enrichedLinkSet.has(link)) {
                return false;
              }

              if (allowedCategoryName !== null && categoryIndex !== -1) {
                const rowCategory = (row[categoryIndex] || "").toLowerCase().trim();
                if (!rowCategory || rowCategory !== allowedCategoryName) {
                  return false;
                }
              }

              return true;
            })
            .map((row: any[]) => ({
              name: nameIndex !== -1 ? row[nameIndex] || "Unknown" : "Unknown",
              email: emailIndex !== -1 ? (row[emailIndex] || "").trim() : "",
              state: stateIndex !== -1 ? row[stateIndex] || "" : "",
              link: linkIndex !== -1 ? row[linkIndex] : "",
              website: websiteIndex !== -1 ? row[websiteIndex] || "" : "",
            }));
        }
      } else {
        console.log("[Apollo] No Store Database sheet found, using qualification_leads table");

        const conditions = [eq(qualificationLeads.tenantId, tenantId)];

        if (projectId) {
          conditions.push(eq(qualificationLeads.projectId, projectId));
        }

        const sqlLeads = await db
          .select({
            id: qualificationLeads.id,
            company: qualificationLeads.company,
            website: qualificationLeads.website,
            category: qualificationLeads.category,
            pocEmail: qualificationLeads.pocEmail,
            state: qualificationLeads.state,
          })
          .from(qualificationLeads)
          .where(and(...conditions));

        leadsWithoutEmails = sqlLeads
          .filter((lead) => {
            const email = (lead.pocEmail || "").trim();
            if (email && email.includes("@")) {
              return false;
            }

            const link = `ql:${lead.id}`;
            if (enrichedLinkSet.has(link)) {
              return false;
            }

            if (allowedCategoryName !== null && !projectId) {
              const leadCategory = (lead.category || "").toLowerCase().trim();
              if (!leadCategory || leadCategory !== allowedCategoryName) {
                return false;
              }
            }

            return true;
          })
          .map((lead) => ({
            name: lead.company || "Unknown",
            email: (lead.pocEmail || "").trim(),
            state: lead.state || "",
            link: `ql:${lead.id}`,
            website: lead.website || "",
          }));

        console.log(`[Apollo] Found ${leadsWithoutEmails.length} leads from qualification_leads table`);
      }

      const seenDomains = new Map();
      const deduplicatedLeads: any[] = [];
      for (const lead of leadsWithoutEmails) {
        const domain = extractDomain(lead.website);
        if (domain && seenDomains.has(domain)) {
          const existing = seenDomains.get(domain);
          if (!existing.allLinks) existing.allLinks = [existing.link];
          existing.allLinks.push(lead.link);
        } else {
          const entry = { ...lead, domain, allLinks: [lead.link] };
          if (domain) seenDomains.set(domain, entry);
          deduplicatedLeads.push(entry);
        }
      }

      res.json({ contacts: deduplicatedLeads });
    } catch (error: any) {
      console.error("Error fetching leads without emails:", error);
      res.status(500).json({ message: error.message || "Failed to fetch leads" });
    }
  };
}
