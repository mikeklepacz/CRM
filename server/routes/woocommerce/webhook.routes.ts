import type { Express } from "express";
import { buildWooCommerceWebhookHandler } from "./webhook.handler";

export function registerWooCommerceWebhookRoutes(app: Express): void {
  app.post('/api/woocommerce/webhook', buildWooCommerceWebhookHandler());
}
