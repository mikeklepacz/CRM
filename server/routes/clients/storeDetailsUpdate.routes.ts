import type { Express } from "express";
import { buildStoreDetailsUpdateHandler } from "./storeDetailsUpdate.handler";

type Deps = {
  isAuthenticatedCustom: any;
};

export function registerStoreDetailsUpdateRoutes(app: Express, deps: Deps): void {
  app.put("/api/store/:storeId", deps.isAuthenticatedCustom, buildStoreDetailsUpdateHandler(deps));
}
