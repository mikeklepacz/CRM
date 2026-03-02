import type { Express } from "express";
import * as googleDrive from "../../googleDrive";
import type { DriveRoutesDeps } from "./drive.types";

export function registerDriveFilesDeleteRoute(app: Express, deps: DriveRoutesDeps): void {
  app.delete("/api/drive/files/:fileId", deps.isAuthenticatedCustom, deps.isAdmin, async (req, res) => {
    try {
      const { fileId } = req.params;
      await googleDrive.deleteFileFromDrive(fileId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: error.message || "Failed to delete file" });
    }
  });
}
