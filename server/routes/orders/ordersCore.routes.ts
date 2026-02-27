import type { Express } from "express";
import { registerOrdersCoreListRoute } from "./ordersCoreList.routes";
import { registerOrdersCorePatchRoute } from "./ordersCorePatch.routes";
import { registerOrdersCoreSaveCommissionsRoute } from "./ordersCoreSaveCommissions.routes";
import type { OrdersCoreRouteDeps } from "./ordersCore.types";

export function registerOrdersCoreRoutes(
  app: Express,
  deps: OrdersCoreRouteDeps,
): void {
  registerOrdersCoreListRoute(app, deps);
  registerOrdersCorePatchRoute(app, deps);
  registerOrdersCoreSaveCommissionsRoute(app, deps);
}
