import type { Express } from "express";
import { buildStoreGoogleSearchHandler } from "./storeGoogleSearch.handler";

type Deps = {
  isAuthenticatedCustom: any;
};

export function registerStoreGoogleSearchRoutes(app: Express, deps: Deps): void {
  app.post("/api/stores/search-google", deps.isAuthenticatedCustom, buildStoreGoogleSearchHandler());
}
