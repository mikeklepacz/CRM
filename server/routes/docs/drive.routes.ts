import type { Express } from "express";
import multer from "multer";
import * as googleDrive from "../../googleDrive";
import { storage } from "../../storage";

type Deps = {
  isAdmin: any;
  isAuthenticatedCustom: any;
};

function extractFolderId(input: string): string {
  if (/^[a-zA-Z0-9_-]+$/.test(input)) {
    return input;
  }

  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /\/drive\/folders\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }

  throw new Error("Invalid Drive folder URL. Please provide a valid Google Drive folder link or ID.");
}

export function registerDriveRoutes(app: Express, deps: Deps): void {
  const upload = multer({ storage: multer.memoryStorage() });

  app.get("/api/drive/folders", deps.isAuthenticatedCustom, async (_req, res) => {
    try {
      const folders = await storage.getAllDriveFolders();
      res.json(folders);
    } catch (error: any) {
      console.error("Error fetching Drive folders:", error);
      res.status(500).json({ message: error.message || "Failed to fetch folders" });
    }
  });

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

  app.delete("/api/drive/folders/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req, res) => {
    try {
      await storage.deleteDriveFolder(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting Drive folder:", error);
      res.status(500).json({ message: error.message || "Failed to delete folder" });
    }
  });

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

  app.post(
    "/api/drive/upload/:folderName",
    deps.isAuthenticatedCustom,
    upload.single("file"),
    async (req: any, res) => {
      try {
        const { folderName } = req.params;

        if (!req.file) {
          return res.status(400).json({ message: "File is required" });
        }

        const folderConfig = await storage.getDriveFolderByName(folderName);
        if (!folderConfig) {
          return res.status(404).json({ message: "Folder not found" });
        }

        const uploadedFile = await googleDrive.uploadFileToDrive(
          folderConfig.folderId,
          req.file.originalname,
          req.file.mimetype,
          req.file.buffer
        );

        res.json(uploadedFile);
      } catch (error: any) {
        console.error("Error uploading file:", error);
        res.status(500).json({ message: error.message || "Failed to upload file" });
      }
    }
  );

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
