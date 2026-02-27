import type { Express } from "express";
import type { DriveRoutesDeps as Deps } from "./drive.types";
import { registerDriveFoldersListRoute } from "./driveFoldersList.routes";
import { registerDriveFoldersCreateRoute } from "./driveFoldersCreate.routes";
import { registerDriveFoldersUpdateRoute } from "./driveFoldersUpdate.routes";
import { registerDriveFoldersDeleteRoute } from "./driveFoldersDelete.routes";
import { registerDriveFilesListRoute } from "./driveFilesList.routes";
import { registerDriveUploadFileRoute } from "./driveUploadFile.routes";
import { registerDriveFilesDeleteRoute } from "./driveFilesDelete.routes";

export function registerDriveRoutes(app: Express, deps: Deps): void {
  registerDriveFoldersListRoute(app, deps);
  registerDriveFoldersCreateRoute(app, deps);
  registerDriveFoldersUpdateRoute(app, deps);
  registerDriveFoldersDeleteRoute(app, deps);
  registerDriveFilesListRoute(app, deps);
  registerDriveUploadFileRoute(app, deps);
  registerDriveFilesDeleteRoute(app, deps);
}
