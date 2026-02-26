import type { Express } from "express";
import multer from "multer";
import { deleteAlignerFile } from "../../services/assistant/alignerFiles/deleteService";
import { syncAlignerKbFiles } from "../../services/assistant/alignerFiles/syncService";
import { uploadAlignerFile } from "../../services/assistant/alignerFiles/uploadService";

type Deps = {
  getEffectiveTenantId: (req: any) => Promise<string>;
  isAdmin: any;
  isAuthenticatedCustom: any;
};

const alignerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = [".txt", ".md", ".pdf", ".docx", ".csv"];
    const extension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf("."));
    if (allowedExtensions.includes(extension)) {
      cb(null, true);
      return;
    }
    cb(new Error(`File type not allowed. Supported formats: ${allowedExtensions.join(", ")}`));
  },
});

export function registerAlignerFilesRoutes(app: Express, deps: Deps): void {
  app.post(
    "/api/aligner/files",
    deps.isAuthenticatedCustom,
    deps.isAdmin,
    alignerUpload.single("file"),
    async (req: any, res) => {
      try {
        const tenantId = await deps.getEffectiveTenantId(req);
        const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
        const result = await uploadAlignerFile({
          category: req.body?.category,
          file: req.file as Express.Multer.File,
          tenantId,
          userId,
        });
        res.json(result);
      } catch (error: any) {
        console.error("[Aligner] Error uploading file:", error);
        res.status(500).json({ error: error.message || "Failed to upload file" });
      }
    }
  );

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

  app.post("/api/aligner/sync-kb", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      const summary = await syncAlignerKbFiles({ tenantId });
      res.json(summary);
    } catch (error: any) {
      console.error("[Aligner Sync] Error syncing KB files:", error);
      res.status(500).json({ error: error.message || "Failed to sync KB files" });
    }
  });
}
