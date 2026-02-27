import type { Express } from "express";
import type { AdminWebhooksDeps as Deps } from "./adminWebhooks.types";
import { registerAdminWebhooksListRoute } from "./adminWebhooksList.routes";
import { registerAdminWebhooksBulkRegisterRoute } from "./adminWebhooksBulkRegister.routes";
import { registerAdminWebhooksRegisterSingleRoute } from "./adminWebhooksRegisterSingle.routes";

export function registerAdminWebhooksRoutes(app: Express, deps: Deps): void {
  registerAdminWebhooksListRoute(app, deps);
  registerAdminWebhooksBulkRegisterRoute(app, deps);
  registerAdminWebhooksRegisterSingleRoute(app, deps);
}
