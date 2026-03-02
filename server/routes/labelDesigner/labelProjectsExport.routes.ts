import type { Express } from "express";
import {
  buildLabelProjectExport,
  LabelProjectExportValidationError,
} from "../../services/labelDesigner/labelProjectExportService";

export function registerLabelProjectsExportRoutes(app: Express): void {
  app.post("/api/label-projects/export", async (req, res) => {
    try {
      const { zipBuffer, driveUrl, filename } = await buildLabelProjectExport(req.body);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      if (driveUrl) {
        res.setHeader("X-Drive-Folder-Url", driveUrl);
      }
      res.setHeader("Content-Length", zipBuffer.length);
      res.send(zipBuffer);
    } catch (error: any) {
      if (error instanceof LabelProjectExportValidationError) {
        return res.status(400).json({ message: error.message });
      }
      console.error("[Label Export] Export failed:", error);
      res.status(500).json({ message: error.message || "Failed to export project" });
    }
  });
}
