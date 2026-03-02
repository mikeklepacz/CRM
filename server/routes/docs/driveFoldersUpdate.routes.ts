import type { Express } from "express";
import { storage } from "../../storage";
import { extractFolderId } from "./drive.helpers";
import type { DriveRoutesDeps } from "./drive.types";

export function registerDriveFoldersUpdateRoute(app: Express, deps: DriveRoutesDeps): void {
  app.put("/api/drive/folders/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, folderUrl } = req.body;

      const updates: any = {};
      if (name) updates.name = name;
      if (folderUrl) updates.folderId = extractFolderId(folderUrl);

      const folder = await storage.updateDriveFolder(id, updates);
      res.json(folder);
    } catch (error: any) {
      console.error("Error updating Drive folder:", error);
      res.status(500).json({ message: error.message || "Failed to update folder" });
    }
  });
}
