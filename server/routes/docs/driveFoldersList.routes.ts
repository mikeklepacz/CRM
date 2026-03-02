import type { Express } from "express";
import { storage } from "../../storage";
import type { DriveRoutesDeps } from "./drive.types";

export function registerDriveFoldersListRoute(app: Express, deps: DriveRoutesDeps): void {
  app.get("/api/drive/folders", deps.isAuthenticatedCustom, async (_req, res) => {
    try {
      const folders = await storage.getAllDriveFolders();
      res.json(folders);
    } catch (error: any) {
      console.error("Error fetching Drive folders:", error);
      res.status(500).json({ message: error.message || "Failed to fetch folders" });
    }
  });
}
