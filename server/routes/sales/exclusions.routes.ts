import type { Express } from "express";
import type { SalesExclusionsDeps as Deps } from "./exclusions.types";
import { registerExclusionsListRoute } from "./exclusionsList.routes";
import { registerExclusionsListByTypeRoute } from "./exclusionsListByType.routes";
import { registerExclusionsCreateRoute } from "./exclusionsCreate.routes";
import { registerExclusionsDeleteRoute } from "./exclusionsDelete.routes";

export function registerSalesExclusionsRoutes(app: Express, deps: Deps): void {
  registerExclusionsListRoute(app, deps);
  registerExclusionsListByTypeRoute(app, deps);
  registerExclusionsCreateRoute(app, deps);
  registerExclusionsDeleteRoute(app, deps);
}
