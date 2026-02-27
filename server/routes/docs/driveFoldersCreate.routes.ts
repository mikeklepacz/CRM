import type { Express } from "express";
import { storage } from "../../storage";
import { extractFolderId } from "./drive.helpers";
import type { DriveRoutesDeps } from "./drive.types";

export function registerDriveFoldersCreateRoute(app: Express, deps: DriveRoutesDeps): void {
  app.post("/api/drive/folders", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { name, folderUrl } = req.body;

      if (!name || !folderUrl) {
        return res.status(400).json({ message: "Folder name and URL are required" });
      }

      const folderId = extractFolderId(folderUrl);
      const folder = await storage.createDriveFolder({
        name,
        tenantId: req.user.tenantId,
        folderId,
        createdBy: userId,
      });

      res.json(folder);
    } catch (error: any) {
      console.error("Error creating Drive folder:", error);
      res.status(500).json({ message: error.message || "Failed to add folder" });
    }
  });
}
