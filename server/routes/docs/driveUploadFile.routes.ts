import type { Express } from "express";
import multer from "multer";
import * as googleDrive from "../../googleDrive";
import { storage } from "../../storage";
import type { DriveRoutesDeps } from "./drive.types";

export function registerDriveUploadFileRoute(app: Express, deps: DriveRoutesDeps): void {
  const upload = multer({ storage: multer.memoryStorage() });

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
}
