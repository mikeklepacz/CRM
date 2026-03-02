import type { Express } from "express";
import { registerOrgAdminInvitesCreateRoute } from "./orgAdminInvitesCreate.routes";
import { registerOrgAdminInvitesDeleteRoute } from "./orgAdminInvitesDelete.routes";
import { registerOrgAdminInvitesListRoute } from "./orgAdminInvitesList.routes";
import { registerOrgAdminSettingsGetRoute } from "./orgAdminSettingsGet.routes";
import { registerOrgAdminSettingsUpdateRoute } from "./orgAdminSettingsUpdate.routes";
import { registerOrgAdminStatsRoute } from "./orgAdminStats.routes";
import { registerOrgAdminUsersCreateRoute } from "./orgAdminUsersCreate.routes";
import { registerOrgAdminUsersDeleteRoute } from "./orgAdminUsersDelete.routes";
import { registerOrgAdminUsersListRoute } from "./orgAdminUsersList.routes";
import { registerOrgAdminUsersRoleUpdateRoute } from "./orgAdminUsersRoleUpdate.routes";
import { registerOrgAdminUsersUpdateRoute } from "./orgAdminUsersUpdate.routes";
import type { OrgAdminCoreRouteDeps } from "./orgAdminCore.types";

export function registerOrgAdminCoreRoutes(
  app: Express,
  deps: OrgAdminCoreRouteDeps
): void {
  registerOrgAdminUsersListRoute(app, deps);
  registerOrgAdminUsersCreateRoute(app, deps);
  registerOrgAdminUsersRoleUpdateRoute(app, deps);
  registerOrgAdminUsersUpdateRoute(app, deps);
  registerOrgAdminUsersDeleteRoute(app, deps);
  registerOrgAdminSettingsGetRoute(app, deps);
  registerOrgAdminSettingsUpdateRoute(app, deps);
  registerOrgAdminStatsRoute(app, deps);
  registerOrgAdminInvitesListRoute(app, deps);
  registerOrgAdminInvitesCreateRoute(app, deps);
  registerOrgAdminInvitesDeleteRoute(app, deps);
}
