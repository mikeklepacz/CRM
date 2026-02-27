import type { Express } from "express";
import type { OrgAdminBlueprintsDeps as Deps } from "./orgAdminBlueprints.types";
import { registerOrgAdminBlueprintsListRoute } from "./orgAdminBlueprintsList.routes";
import { registerOrgAdminBlueprintsGetByIdRoute } from "./orgAdminBlueprintsGetById.routes";
import { registerOrgAdminBlueprintsCreateRoute } from "./orgAdminBlueprintsCreate.routes";
import { registerOrgAdminBlueprintsPatchRoute } from "./orgAdminBlueprintsPatch.routes";
import { registerOrgAdminBlueprintsDeleteRoute } from "./orgAdminBlueprintsDelete.routes";

export function registerOrgAdminBlueprintsRoutes(
  app: Express,
  deps: Deps
): void {
  registerOrgAdminBlueprintsListRoute(app, deps);
  registerOrgAdminBlueprintsGetByIdRoute(app, deps);
  registerOrgAdminBlueprintsCreateRoute(app, deps);
  registerOrgAdminBlueprintsPatchRoute(app, deps);
  registerOrgAdminBlueprintsDeleteRoute(app, deps);
}
