import type { Express } from "express";
import type { KbManagementDeps as Deps } from "./kbManagement.types";
import { registerKbFilesListRoute } from "./kbFilesList.routes";
import { registerKbFileGetByIdRoute } from "./kbFileGetById.routes";
import { registerKbFilePatchRoute } from "./kbFilePatch.routes";
import { registerKbFileVersionsRoute } from "./kbFileVersions.routes";
import { registerKbProposalsListRoute } from "./kbProposalsList.routes";
import { registerKbProposalsDeleteAllRoute } from "./kbProposalsDeleteAll.routes";
import { registerKbProposalDeleteByIdRoute } from "./kbProposalDeleteById.routes";

export function registerKbManagementRoutes(app: Express, deps: Deps): void {
  registerKbFilesListRoute(app, deps);
  registerKbFileGetByIdRoute(app, deps);
  registerKbFilePatchRoute(app, deps);
  registerKbFileVersionsRoute(app, deps);
  registerKbProposalsListRoute(app, deps);
  registerKbProposalsDeleteAllRoute(app, deps);
  registerKbProposalDeleteByIdRoute(app, deps);
}
