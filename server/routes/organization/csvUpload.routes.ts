import type { Express } from "express";
import { processCsvUpload } from "../../services/organization/csvUploadService";

type Deps = {
  isAuthenticatedCustom: any;
  isAdmin: any;
};

export function registerCsvUploadRoutes(app: Express, deps: Deps): void {
  app.post("/api/csv/upload", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const payload = await processCsvUpload({
        body: req.body,
        tenantId: req.user.tenantId,
        userId: req.user.claims.sub,
      });
      res.json({
        message: "CSV uploaded successfully",
        ...payload,
      });
    } catch (error: any) {
      if (error.message === "Missing required fields") {
        return res.status(400).json({ message: error.message });
      }
      console.error("CSV upload error:", error);
      res.status(500).json({ message: error.message || "Upload failed" });
    }
  });
}
