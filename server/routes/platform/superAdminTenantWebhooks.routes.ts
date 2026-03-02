import type { Express } from "express";
import type { SuperAdminTenantWebhooksDeps } from "./superAdminTenantWebhooks.types";
import { registerSuperAdminTenantWebhooksListRoute } from "./superAdminTenantWebhooksList.routes";
import { registerSuperAdminTenantWebhooksBulkRegisterRoute } from "./superAdminTenantWebhooksBulkRegister.routes";
import { registerSuperAdminTenantWebhooksRegisterSingleRoute } from "./superAdminTenantWebhooksRegisterSingle.routes";

export function registerSuperAdminTenantWebhooksRoutes(
  app: Express,
  deps: SuperAdminTenantWebhooksDeps
): void {
  registerSuperAdminTenantWebhooksListRoute(app, deps);
  registerSuperAdminTenantWebhooksBulkRegisterRoute(app, deps);
  registerSuperAdminTenantWebhooksRegisterSingleRoute(app, deps);
}
