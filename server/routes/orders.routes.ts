import type { Express } from "express";
import { registerOrderMatchRoutes } from "./orders/orderMatch.routes";
import { registerOrderMatchSuggestionsRoutes } from "./orders/orderMatchSuggestions.routes";
import { registerOrderStoreDetailsContextRoutes } from "./orders/orderStoreDetailsContext.routes";
import { registerOrdersCoreRoutes } from "./orders/ordersCore.routes";

export function registerOrderRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any },
): void {
  registerOrdersCoreRoutes(app, deps);
  registerOrderStoreDetailsContextRoutes(app, deps);
  registerOrderMatchSuggestionsRoutes(app, deps);
  registerOrderMatchRoutes(app, deps);
}
