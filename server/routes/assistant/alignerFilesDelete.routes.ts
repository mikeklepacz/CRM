import type { Express } from "express";
import { deleteAlignerFile } from "../../services/assistant/alignerFiles/deleteService";
import type { AlignerFilesDeps } from "./alignerFiles.types";

export function registerAlignerFilesDeleteRoute(app: Express, deps: AlignerFilesDeps): void {
  app.delete("/api/aligner/files/:fileId", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      const result = await deleteAlignerFile({
        fileId: req.params.fileId,
        tenantId,
      });
      res.json(result);
    } catch (error: any) {
      console.error("[Aligner] Error deleting file:", error);
      res.status(500).json({ error: error.message || "Failed to delete file" });
    }
  });
}
