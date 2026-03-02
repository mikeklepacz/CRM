import type { Express } from "express";
import { updateKbFileContent } from "../../services/assistant/kbFileUpdateService";
import type { KbManagementDeps } from "./kbManagement.types";

export function registerKbFilePatchRoute(app: Express, deps: KbManagementDeps): void {
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
}
