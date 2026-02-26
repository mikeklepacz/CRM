import type { Express } from "express";
import { rollbackKbFileVersion } from "../../services/assistant/kbRollbackService";

type Deps = {
  isAuthenticatedCustom: any;
  isAdmin: any;
  syncKbFileToAlignerVectorStore: (
    kbFileId: string,
    content: string,
    filename: string,
    tenantId: string
  ) => Promise<{ success: boolean; error?: string }>;
};

export function registerKbRollbackRoutes(app: Express, deps: Deps): void {
  app.post("/api/kb/files/:id/rollback", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { versionId } = req.body;
      const payload = await rollbackKbFileVersion({
        fileId: req.params.id,
        versionId,
        tenantId: req.user.tenantId,
        userId,
        syncKbFileToAlignerVectorStore: deps.syncKbFileToAlignerVectorStore,
      });
      res.json({ success: true, ...payload });
    } catch (error: any) {
      if (error.statusCode === 404) {
        const message = error.message === "Version not found" ? "Version not found" : "File not found";
        return res.status(404).json({ error: message });
      }
      console.error("[KB] Error rolling back file:", error);
      res.status(500).json({ error: error.message || "Failed to rollback file" });
    }
  });
}
