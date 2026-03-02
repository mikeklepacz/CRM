import type { Express } from "express";
import { buildOpenaiFilesUploadHandler } from "./openaiFilesUpload.handler";

type Deps = {
  checkAdminAccess: (user: any, tenantId: string | undefined) => Promise<boolean>;
  isAuthenticated: any;
};

export function registerOpenaiFilesUploadRoutes(app: Express, deps: Deps): void {
  app.post("/api/openai/files/upload", deps.isAuthenticated, buildOpenaiFilesUploadHandler(deps));
}
