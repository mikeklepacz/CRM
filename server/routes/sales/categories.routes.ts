import type { Express } from "express";
import type { SalesCategoriesDeps as Deps } from "./categories.types";
import { registerCategoriesGetAllRoute } from "./categoriesGetAll.routes";
import { registerCategoriesGetActiveRoute } from "./categoriesGetActive.routes";
import { registerCategoriesCreateRoute } from "./categoriesCreate.routes";
import { registerCategoriesUpdateRoute } from "./categoriesUpdate.routes";
import { registerCategoriesDeleteRoute } from "./categoriesDelete.routes";

export function registerSalesCategoriesRoutes(app: Express, deps: Deps): void {
  registerCategoriesGetAllRoute(app, deps);
  registerCategoriesGetActiveRoute(app, deps);
  registerCategoriesCreateRoute(app, deps);
  registerCategoriesUpdateRoute(app, deps);
  registerCategoriesDeleteRoute(app, deps);
}
