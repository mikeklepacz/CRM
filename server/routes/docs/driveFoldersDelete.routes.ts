import type { Express } from "express";
import { storage } from "../../storage";
import type { DriveRoutesDeps } from "./drive.types";

export function registerDriveFoldersDeleteRoute(app: Express, deps: DriveRoutesDeps): void {
  app.delete("/api/drive/folders/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req, res) => {
    try {
      await storage.deleteDriveFolder(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting Drive folder:", error);
      res.status(500).json({ message: error.message || "Failed to delete folder" });
    }
  });
}
