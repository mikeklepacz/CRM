import type { Express } from "express";
import { registerSuperAdminUsersCreateRoute } from "./superAdminUsersCreate.routes";
import { registerSuperAdminUsersDeactivateRoute } from "./superAdminUsersDeactivate.routes";
import { registerSuperAdminUsersListRoute } from "./superAdminUsersList.routes";
import { registerSuperAdminUsersPatchRoute } from "./superAdminUsersPatch.routes";
import { registerSuperAdminUsersReactivateRoute } from "./superAdminUsersReactivate.routes";
import { registerSuperAdminUsersResetPasswordRoute } from "./superAdminUsersResetPassword.routes";
import { registerSuperAdminUsersVoiceAccessRoute } from "./superAdminUsersVoiceAccess.routes";
import { registerSuperAdminUserTenantsAddRoute } from "./superAdminUserTenantsAdd.routes";
import { registerSuperAdminUserTenantsDeleteRoute } from "./superAdminUserTenantsDelete.routes";
import { registerSuperAdminUserTenantsGetRoute } from "./superAdminUserTenantsGet.routes";
import { registerSuperAdminUserTenantsPatchRoute } from "./superAdminUserTenantsPatch.routes";
import type { SuperAdminUsersRouteDeps } from "./superAdminUsers.types";

export function registerSuperAdminUsersRoutes(
  app: Express,
  deps: SuperAdminUsersRouteDeps
): void {
  registerSuperAdminUsersListRoute(app, deps);
  registerSuperAdminUserTenantsGetRoute(app, deps);
  registerSuperAdminUserTenantsAddRoute(app, deps);
  registerSuperAdminUserTenantsDeleteRoute(app, deps);
  registerSuperAdminUserTenantsPatchRoute(app, deps);
  registerSuperAdminUsersCreateRoute(app, deps);
  registerSuperAdminUsersPatchRoute(app, deps);
  registerSuperAdminUsersResetPasswordRoute(app, deps);
  registerSuperAdminUsersDeactivateRoute(app, deps);
  registerSuperAdminUsersReactivateRoute(app, deps);
  registerSuperAdminUsersVoiceAccessRoute(app, deps);
}
