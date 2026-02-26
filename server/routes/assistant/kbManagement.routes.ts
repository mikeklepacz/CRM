import type { Express } from "express";
import { storage } from "../../storage";
import { updateKbFileContent } from "../../services/assistant/kbFileUpdateService";

type Deps = {
  isAuthenticatedCustom: any;
  isAdmin: any;
  syncKbDocumentToElevenLabs: (
    apiKey: string,
    oldDocId: string,
    filename: string,
    content: string,
    tenantId: string
  ) => Promise<{ success: boolean; newDocId?: string; agentsUpdated?: number; error?: string }>;
  syncKbFileToAlignerVectorStore: (
    kbFileId: string,
    content: string,
    filename: string,
    tenantId: string
  ) => Promise<{ success: boolean; error?: string }>;
};

export function registerKbManagementRoutes(app: Express, deps: Deps): void {
  app.get("/api/kb/files", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { projectId } = req.query;
      const files = await storage.getAllKbFiles(tenantId, projectId as string | undefined);
      res.json({ files });
    } catch (error: any) {
      console.error("[KB] Error fetching files:", error);
      res.status(500).json({ error: error.message || "Failed to fetch KB files" });
    }
  });

  app.get("/api/kb/files/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const file = await storage.getKbFileById(req.params.id, req.user.tenantId);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      res.json(file);
    } catch (error: any) {
      console.error("[KB] Error fetching file:", error);
      res.status(500).json({ error: error.message || "Failed to fetch KB file" });
    }
  });

  app.patch("/api/kb/files/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const updatedFile = await updateKbFileContent({
        fileId: req.params.id,
        content,
        tenantId: req.user.tenantId,
        userId,
        syncKbDocumentToElevenLabs: deps.syncKbDocumentToElevenLabs,
        syncKbFileToAlignerVectorStore: deps.syncKbFileToAlignerVectorStore,
      });

      res.json(updatedFile);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return res.status(404).json({ error: "File not found" });
      }
      console.error("[KB Update] Error updating file:", error);
      res.status(500).json({ error: error.message || "Failed to update KB file" });
    }
  });

  app.get("/api/kb/files/:id/versions", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const versions = await storage.getKbFileVersions(req.params.id, req.user.tenantId);
      res.json({ versions });
    } catch (error: any) {
      console.error("[KB] Error fetching versions:", error);
      res.status(500).json({ error: error.message || "Failed to fetch versions" });
    }
  });

  app.get("/api/kb/proposals", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { status, fileId } = req.query;
      const proposals = await storage.getKbProposals(req.user.tenantId, {
        status: status as string,
        kbFileId: fileId as string,
      });
      res.json({ proposals });
    } catch (error: any) {
      console.error("[KB] Error fetching proposals:", error);
      res.status(500).json({ error: error.message || "Failed to fetch proposals" });
    }
  });

  app.delete("/api/kb/proposals", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const deletedCount = await storage.deleteAllKbProposals(req.user.tenantId);
      console.log(`[KB] Deleted ${deletedCount} proposals`);
      res.json({ deletedCount });
    } catch (error: any) {
      console.error("[KB] Error deleting proposals:", error);
      res.status(500).json({ error: error.message || "Failed to delete proposals" });
    }
  });

  app.delete("/api/kb/proposals/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const deleted = await storage.deleteKbProposal(req.params.id, req.user.tenantId);
      if (!deleted) {
        return res.status(404).json({ error: "Proposal not found" });
      }
      console.log(`[KB] Deleted proposal ${req.params.id}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[KB] Error deleting proposal:", error);
      res.status(500).json({ error: error.message || "Failed to delete proposal" });
    }
  });
}
