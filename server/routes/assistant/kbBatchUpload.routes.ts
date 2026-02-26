import type { Express } from "express";
import multer from "multer";
import { processKbBatchUpload } from "../../services/assistant/kbBatchUploadService";

type Deps = {
  isAuthenticatedCustom: any;
  isAdmin: any;
};

const kbUpload = multer({ storage: multer.memoryStorage() });

export function registerKbBatchUploadRoutes(app: Express, deps: Deps): void {
  app.post(
    "/api/kb/upload-batch",
    deps.isAuthenticatedCustom,
    deps.isAdmin,
    kbUpload.array("files", 50),
    async (req: any, res) => {
      try {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return res.status(400).json({ error: "No files uploaded" });
        }

        const payload = await processKbBatchUpload({
          files,
          tenantId: req.user.tenantId,
          createdBy: req.user.id,
        });

        res.json({ success: true, ...payload });
      } catch (error: any) {
        console.error("[KB Upload] Error in batch upload:", error);
        res.status(500).json({ error: error.message || "Failed to upload files" });
      }
    }
  );
}
