import type { Express } from "express";
import type { SheetsContactActionDeps as Deps } from "./sheetsContactAction.types";
import { registerSheetsClaimStoreWithContactRoute } from "./sheetsClaimStoreWithContact.routes";
import { registerSheetsUpdateContactActionRoute } from "./sheetsUpdateContactAction.routes";

export function registerSheetsContactActionRoutes(app: Express, deps: Deps): void {
  registerSheetsClaimStoreWithContactRoute(app, deps);
  registerSheetsUpdateContactActionRoute(app, deps);
}
