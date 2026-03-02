import type { Express } from "express";
import { uploadAlignerFile } from "../../services/assistant/alignerFiles/uploadService";
import type { AlignerFilesDeps } from "./alignerFiles.types";
import { alignerUpload } from "./alignerFilesUpload.shared";

export function registerAlignerFilesUploadRoute(app: Express, deps: AlignerFilesDeps): void {
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
}
