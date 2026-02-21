import type { Express } from "express";
import { registerWooCommerceSettingsRoutes } from "./woocommerce/settings.routes";
import { registerWooCommerceSyncRoutes } from "./woocommerce/sync.routes";
import { registerWooCommerceTrackerRoutes } from "./woocommerce/tracker.routes";
import { registerWooCommerceWebhookRoutes } from "./woocommerce/webhook.routes";

export function registerWooCommerceRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any },
): void {
  registerWooCommerceSettingsRoutes(app, deps);
  registerWooCommerceWebhookRoutes(app);
  registerWooCommerceSyncRoutes(app, deps);
  registerWooCommerceTrackerRoutes(app, deps);
}
