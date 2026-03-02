import type { Express } from "express";
import type { SuperAdminTenantWebhooksDeps } from "./superAdminTenantWebhooks.types";
import { handleSuperAdminTenantWebhooksBulkRegister } from "./superAdminTenantWebhooksBulkRegister.handler";

export function registerSuperAdminTenantWebhooksBulkRegisterRoute(app: Express, deps: SuperAdminTenantWebhooksDeps): void {
  app.post(
    "/api/super-admin/tenants/:tenantId/webhooks/bulk-register",
    deps.requireSuperAdmin,
    async (req: any, res) => {
      await handleSuperAdminTenantWebhooksBulkRegister(req, res);
    }
  );
}
