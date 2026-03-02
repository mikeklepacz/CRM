import type { Express } from "express";
import type { AdminWebhooksDeps } from "./adminWebhooks.types";
import { handleAdminWebhooksBulkRegister } from "./adminWebhooksBulkRegister.handler";

export function registerAdminWebhooksBulkRegisterRoute(app: Express, deps: AdminWebhooksDeps): void {
  app.post("/api/admin/webhooks/bulk-register", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    await handleAdminWebhooksBulkRegister(req, res);
  });
}
