import type { Express } from "express";
import { registerOrgAdminProjectsArchiveRoute } from "./orgAdminProjectsArchive.routes";
import { registerOrgAdminProjectsConfigRoute } from "./orgAdminProjectsConfig.routes";
import { registerOrgAdminProjectsCreateRoute } from "./orgAdminProjectsCreate.routes";
import { registerOrgAdminProjectsDeleteRoute } from "./orgAdminProjectsDelete.routes";
import { registerOrgAdminProjectsGetByIdRoute } from "./orgAdminProjectsGetById.routes";
import { registerOrgAdminProjectsListRoute } from "./orgAdminProjectsList.routes";
import { registerOrgAdminProjectsPatchRoute } from "./orgAdminProjectsPatch.routes";
import { registerOrgAdminProjectsRestoreRoute } from "./orgAdminProjectsRestore.routes";
import { registerOrgAdminProjectsSetDefaultRoute } from "./orgAdminProjectsSetDefault.routes";
import type { OrgAdminProjectsRouteDeps } from "./orgAdminProjects.types";

export function registerOrgAdminProjectsRoutes(
  app: Express,
  deps: OrgAdminProjectsRouteDeps
): void {
  registerOrgAdminProjectsListRoute(app, deps);
  registerOrgAdminProjectsGetByIdRoute(app, deps);
  registerOrgAdminProjectsCreateRoute(app, deps);
  registerOrgAdminProjectsPatchRoute(app, deps);
  registerOrgAdminProjectsArchiveRoute(app, deps);
  registerOrgAdminProjectsRestoreRoute(app, deps);
  registerOrgAdminProjectsSetDefaultRoute(app, deps);
  registerOrgAdminProjectsDeleteRoute(app, deps);
  registerOrgAdminProjectsConfigRoute(app, deps);
}
