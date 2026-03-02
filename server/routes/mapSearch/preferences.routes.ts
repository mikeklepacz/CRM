import type { Express } from "express";
import type { MapSearchPreferencesDeps as Deps } from "./preferences.types";
import { registerUserActiveExclusionsUpdateRoute } from "./userActiveExclusionsUpdate.routes";
import { registerMapSearchHistoryListRoute } from "./mapSearchHistoryList.routes";
import { registerMapSearchHistoryDeleteRoute } from "./mapSearchHistoryDelete.routes";
import { registerMapSearchLastCategoryGetRoute } from "./mapSearchLastCategoryGet.routes";
import { registerMapSearchLastCategoryPostRoute } from "./mapSearchLastCategoryPost.routes";
import { registerUserSelectedCategoryGetRoute } from "./userSelectedCategoryGet.routes";
import { registerUserSelectedCategoryPostRoute } from "./userSelectedCategoryPost.routes";

export function registerMapSearchPreferenceRoutes(app: Express, deps: Deps): void {
  registerUserActiveExclusionsUpdateRoute(app, deps);
  registerMapSearchHistoryListRoute(app, deps);
  registerMapSearchHistoryDeleteRoute(app, deps);
  registerMapSearchLastCategoryGetRoute(app, deps);
  registerMapSearchLastCategoryPostRoute(app, deps);
  registerUserSelectedCategoryGetRoute(app, deps);
  registerUserSelectedCategoryPostRoute(app, deps);
}
