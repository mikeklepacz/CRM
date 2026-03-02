import type { Express } from "express";
import type { SuperAdminTicketsWebhooksRouteDeps } from "./superAdminTicketsWebhooks.types";
import { handleSuperAdminWebhooksBulkRegister } from "./superAdminWebhooksBulkRegister.handler";

export function registerSuperAdminWebhooksBulkRegisterRoute(app: Express, deps: SuperAdminTicketsWebhooksRouteDeps): void {
  app.post("/api/super-admin/webhooks/bulk-register", deps.isAuthenticatedCustom, async (req: any, res) => {
    await handleSuperAdminWebhooksBulkRegister(req, res);
  });
}
