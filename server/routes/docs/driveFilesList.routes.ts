import type { Express } from "express";
import * as googleDrive from "../../googleDrive";
import type { DriveRoutesDeps } from "./drive.types";

export function registerDriveFilesListRoute(app: Express, deps: DriveRoutesDeps): void {
  app.get("/api/drive/files/:driveFolderId", deps.isAuthenticatedCustom, async (req, res) => {
    try {
      const { driveFolderId } = req.params;
      const files = await googleDrive.listFilesInFolder(driveFolderId);
      res.json(files);
    } catch (error: any) {
      console.error("Error listing Drive files:", error);
      res.status(500).json({ message: error.message || "Failed to list files" });
    }
  });
}
