import type { Express } from "express";
import { handleStoreDetailsRead } from "./storeDetailsRead.handler";

type Deps = {
  isAuthenticatedCustom: any;
};

export function registerStoreDetailsReadRoutes(app: Express, deps: Deps): void {
  app.get("/api/store/:storeId", deps.isAuthenticatedCustom, async (req: any, res, next) => {
    await handleStoreDetailsRead(req, res, next);
  });
}
