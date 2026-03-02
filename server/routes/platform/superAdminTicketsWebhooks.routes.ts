import type { Express } from "express";
import { registerSuperAdminTicketsListRoute } from "./superAdminTicketsList.routes";
import { registerSuperAdminWebhooksBulkRegisterRoute } from "./superAdminWebhooksBulkRegister.routes";
import { registerSuperAdminWebhooksListRoute } from "./superAdminWebhooksList.routes";
import { registerSuperAdminWebhooksRegisterSingleRoute } from "./superAdminWebhooksRegisterSingle.routes";
import type { SuperAdminTicketsWebhooksRouteDeps } from "./superAdminTicketsWebhooks.types";

export function registerSuperAdminTicketsWebhooksRoutes(
  app: Express,
  deps: SuperAdminTicketsWebhooksRouteDeps
): void {
  registerSuperAdminTicketsListRoute(app, deps);
  registerSuperAdminWebhooksListRoute(app, deps);
  registerSuperAdminWebhooksBulkRegisterRoute(app, deps);
  registerSuperAdminWebhooksRegisterSingleRoute(app, deps);
}
