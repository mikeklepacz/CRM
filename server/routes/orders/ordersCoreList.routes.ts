import type { Express } from "express";
import type { OrdersCoreRouteDeps } from "./ordersCore.types";
import { handleOrdersCoreList } from "./ordersCoreList.handler";

export function registerOrdersCoreListRoute(app: Express, deps: OrdersCoreRouteDeps): void {
  app.get("/api/orders", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    await handleOrdersCoreList(req, res);
  });
}
