import { buildSheetRange } from "../sheets/a1Range";
import { resolveStoreDatabaseSheet } from "../sheets/storeDatabaseResolver";

type CrawlDeps = {
  clearUserCache: (userId: string) => void;
  crawlWebsiteForEmail: (website: string) => Promise<{ email: string | null; searched: boolean; skipped?: boolean }>;
  googleSheets: {
    readSheetData: (spreadsheetId: string, range: string) => Promise<any[][]>;
    writeSheetData: (spreadsheetId: string, range: string, values: any[][]) => Promise<any>;
  };
  storage: any;
};

export function createGetClientsHandler(storage: any) {
  return async (req: any, res: any) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const selectedCategory = await storage.getSelectedCategory(userId, tenantId);
      const clients = await storage.getAllClients(tenantId);
      const filteredClients = selectedCategory
        ? clients.filter((client: any) => client.category === selectedCategory)
        : clients;

      res.json(filteredClients);
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: error.message || "Failed to fetch clients" });
    }
  };
}

export function createFilteredClientsHandler(storage: any) {
  return async (req: any, res: any) => {
    try {
      const { search, nameFilter, cityFilter, states, cities, status } = req.body;
      const user = req.currentUser;
      const filters: any = { search, nameFilter, cityFilter, states, cities, status };
      const showMyStoresOnly = user?.preferences?.showMyStoresOnly ?? false;
      if (user.role !== "admin" && showMyStoresOnly) {
        filters.agentId = user.id;
      }

      const tenantId = (req.user as any).tenantId;
      const clients = await storage.getFilteredClients(tenantId, filters);
      res.json(clients);
    } catch (error: any) {
      console.error("Error fetching filtered clients:", error);
      res.status(500).json({ message: error.message || "Failed to fetch filtered clients" });
    }
  };
}

export function createClaimClientHandler(storage: any) {
  return async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const tenantId = (req.user as any).tenantId;
      const client = await storage.getClient(id, tenantId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      if (client.assignedAgent) {
        return res.status(400).json({ message: "Client already claimed" });
      }

      const updated = await storage.claimClient(id, req.currentUser.id);
      res.json(updated);
    } catch (error: any) {
      console.error("Error claiming client:", error);
      res.status(500).json({ message: error.message || "Failed to claim client" });
    }
  };
}

export function createUnclaimClientHandler(storage: any) {
  return async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const updated = await storage.unclaimClient(id);
      res.json(updated);
    } catch (error: any) {
      console.error("Error unclaiming client:", error);
      res.status(500).json({ message: error.message || "Failed to unclaim client" });
    }
  };
}

export function createGetClientNotesHandler(storage: any) {
  return async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const notes = await storage.getClientNotes(id, tenantId);
      res.json(notes);
    } catch (error: any) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ message: error.message || "Failed to fetch notes" });
    }
  };
}

export function createCreateClientNoteHandler(storage: any) {
  return async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { content, isFollowUp } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Note content is required" });
      }

      const note = await storage.createNote({
        clientId: id,
        userId: req.currentUser.id,
        content,
        isFollowUp: isFollowUp || false,
        tenantId: (req.user as any).tenantId,
      });

      res.json(note);
    } catch (error: any) {
      console.error("Error creating note:", error);
      res.status(500).json({ message: error.message || "Failed to create note" });
    }
  };
}

function normalizeUrl(url: string): string {
  if (!url) return "";
  return url.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}

export function createCrawlClientEmailsHandler(deps: CrawlDeps) {
  const { clearUserCache, crawlWebsiteForEmail, googleSheets, storage } = deps;

  return async (req: any, res: any) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ message: "Tenant ID required" });

      const { visibleWebsites, projectId } = req.body as {
        visibleWebsites?: Array<{ website: string; hasEmail: boolean }>;
        projectId?: string;
      };

      let authorizedCategoryName: string | null = null;
      if (projectId) {
        const project = await storage.getTenantProjectById(projectId, tenantId);
        if (!project) {
          return res.status(403).json({ message: "Invalid or unauthorized project" });
        }
        authorizedCategoryName = project.name;
      }

      if (!visibleWebsites || visibleWebsites.length === 0) {
        return res.json({ message: "No websites to check", totalProcessed: 0, emailsFound: 0, remainingToProcess: 0, hasMore: false });
      }

      const storeSheet = await resolveStoreDatabaseSheet({
        tenantId,
        projectId,
        preferProjectMatch: true,
      });
      if (!storeSheet) return res.status(400).json({ message: "No Store Database sheet configured" });

      const rows = await googleSheets.readSheetData(storeSheet.spreadsheetId, buildSheetRange(storeSheet.sheetName, "A:ZZ"));
      if (rows.length <= 1) {
        return res.json({ message: "No data", totalProcessed: 0, emailsFound: 0, remainingToProcess: 0, hasMore: false });
      }

      const headers = rows[0].map((h: any) => (h || "").toString());
      const websiteIdx = headers.findIndex((h: string) => h.toLowerCase().trim() === "website");
      const emailIdx = headers.findIndex((h: string) => h.toLowerCase().trim() === "email");
      const searchedIdx = headers.findIndex((h: string) => h.toLowerCase().trim() === "email searched");
      const categoryIdx = headers.findIndex((h: string) => h.toLowerCase().trim() === "category");

      if (websiteIdx === -1) return res.status(400).json({ message: "No Website column found" });
      if (emailIdx === -1) return res.status(400).json({ message: "No Email column found" });

      const authorizedWebsiteToRow = new Map<string, { rowIndex: number; originalUrl: string }>();
      for (let i = 1; i < rows.length; i++) {
        const website = rows[i][websiteIdx]?.toString().trim() || "";
        const email = rows[i][emailIdx]?.toString().trim() || "";
        const rowCategory = categoryIdx !== -1 ? rows[i][categoryIdx]?.toString().trim().toLowerCase() : "";
        if (!website || email) continue;
        if (authorizedCategoryName && rowCategory && rowCategory !== authorizedCategoryName.toLowerCase()) continue;
        authorizedWebsiteToRow.set(normalizeUrl(website), { rowIndex: i + 1, originalUrl: website });
      }

      const needsCrawling: Array<{ website: string; rowIndex: number }> = [];
      for (const website of visibleWebsites) {
        if (!website.website || website.hasEmail) continue;
        const match = authorizedWebsiteToRow.get(normalizeUrl(website.website));
        if (match) needsCrawling.push({ website: match.originalUrl, rowIndex: match.rowIndex });
      }

      if (needsCrawling.length === 0) {
        return res.json({ message: "No authorized websites need crawling", totalProcessed: 0, emailsFound: 0, remainingToProcess: 0, hasMore: false });
      }

      const toProcess = needsCrawling.slice(0, 10);
      const results: Array<{ rowIndex: number; email: string | null; searched: boolean }> = [];

      for (const { rowIndex, website } of toProcess) {
        try {
          const crawl = await crawlWebsiteForEmail(website);
          if (!crawl.skipped && rowIndex) {
            if (crawl.email && emailIdx !== -1) {
              await googleSheets.writeSheetData(
                storeSheet.spreadsheetId,
                buildSheetRange(storeSheet.sheetName, `${String.fromCharCode(65 + emailIdx)}${rowIndex}`),
                [[crawl.email]]
              );
            }
            if (crawl.searched && searchedIdx !== -1) {
              await googleSheets.writeSheetData(
                storeSheet.spreadsheetId,
                buildSheetRange(storeSheet.sheetName, `${String.fromCharCode(65 + searchedIdx)}${rowIndex}`),
                [["Yes"]]
              );
            }
          }
          results.push({ rowIndex, email: crawl.email, searched: crawl.searched });
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch {
          results.push({ rowIndex, email: null, searched: false });
        }
      }

      clearUserCache(req.user.isPasswordAuth ? req.user.id : req.user.claims.sub);
      res.json({
        totalProcessed: results.length,
        emailsFound: results.filter((r) => r.email).length,
        remainingToProcess: needsCrawling.length - results.length,
        hasMore: needsCrawling.length > 10,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };
}
