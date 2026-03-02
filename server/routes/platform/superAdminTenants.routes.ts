import type { Express } from "express";
import type { SuperAdminTenantsDeps as Deps } from "./superAdminTenants.types";
import { registerSuperAdminTenantsListRoute } from "./superAdminTenantsList.routes";
import { registerSuperAdminTenantsGetByIdRoute } from "./superAdminTenantsGetById.routes";
import { registerSuperAdminTenantsCreateRoute } from "./superAdminTenantsCreate.routes";
import { registerSuperAdminTenantsPatchRoute } from "./superAdminTenantsPatch.routes";
import { registerSuperAdminSwitchTenantRoute } from "./superAdminSwitchTenant.routes";
import { registerSuperAdminSwitchTenantClearRoute } from "./superAdminSwitchTenantClear.routes";
import { registerSuperAdminPlatformMetricsRoute } from "./superAdminPlatformMetrics.routes";
import { registerSuperAdminTenantUsersListRoute } from "./superAdminTenantUsersList.routes";
import { registerSuperAdminTenantProjectsListRoute } from "./superAdminTenantProjectsList.routes";

export function registerSuperAdminTenantsRoutes(
  app: Express,
  deps: Deps
): void {
  registerSuperAdminTenantsListRoute(app, deps);
  registerSuperAdminTenantsGetByIdRoute(app, deps);
  registerSuperAdminTenantsCreateRoute(app, deps);
  registerSuperAdminTenantsPatchRoute(app, deps);
  registerSuperAdminSwitchTenantRoute(app, deps);
  registerSuperAdminSwitchTenantClearRoute(app, deps);
  registerSuperAdminPlatformMetricsRoute(app, deps);
  registerSuperAdminTenantUsersListRoute(app, deps);
  registerSuperAdminTenantProjectsListRoute(app, deps);
}
