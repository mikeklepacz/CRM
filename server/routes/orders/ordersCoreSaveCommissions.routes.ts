import type { Express } from "express";
import type { OrdersCoreRouteDeps } from "./ordersCore.types";
import { buildOrdersCoreSaveCommissionsHandler } from "./ordersCoreSaveCommissions.handler";

export function registerOrdersCoreSaveCommissionsRoute(app: Express, deps: OrdersCoreRouteDeps): void {
  // Save commission settings for multiple orders (database + Google Sheets)
  app.post('/api/orders/save-commissions', deps.isAuthenticatedCustom, deps.isAdmin, buildOrdersCoreSaveCommissionsHandler());
}
