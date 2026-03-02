import type { Express } from "express";
import { handleOrderStoreDetailsContext } from "./orderStoreDetailsContext.handler";

export function registerOrderStoreDetailsContextRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any },
): void {
  app.get("/api/orders/:orderId/store-details-context", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    await handleOrderStoreDetailsContext(req, res);
  });
}
