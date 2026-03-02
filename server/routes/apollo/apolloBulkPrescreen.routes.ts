import type { Express } from "express";
import type { ApolloPrescreenDeps } from "./apolloPrescreen.types";
import { handleApolloBulkPrescreen } from "./apolloBulkPrescreen.handler";

export function registerApolloBulkPrescreenRoute(app: Express, deps: ApolloPrescreenDeps): void {
  app.post("/api/apollo/bulk-prescreen", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    await handleApolloBulkPrescreen(req, res, deps.getEffectiveTenantId);
  });
}
