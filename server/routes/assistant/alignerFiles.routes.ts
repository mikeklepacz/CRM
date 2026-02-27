import type { Express } from "express";
import type { AlignerFilesDeps as Deps } from "./alignerFiles.types";
import { registerAlignerFilesUploadRoute } from "./alignerFilesUpload.routes";
import { registerAlignerFilesDeleteRoute } from "./alignerFilesDelete.routes";
import { registerAlignerSyncKbRoute } from "./alignerSyncKb.routes";

export function registerAlignerFilesRoutes(app: Express, deps: Deps): void {
  registerAlignerFilesUploadRoute(app, deps);
  registerAlignerFilesDeleteRoute(app, deps);
  registerAlignerSyncKbRoute(app, deps);
}
