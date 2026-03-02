import type { Express } from "express";
import type { SalesStatusesDeps as Deps } from "./statuses.types";
import { registerStatusesGetAllRoute } from "./statusesGetAll.routes";
import { registerStatusesGetActiveRoute } from "./statusesGetActive.routes";
import { registerStatusesCreateRoute } from "./statusesCreate.routes";
import { registerStatusesUpdateRoute } from "./statusesUpdate.routes";
import { registerStatusesDeleteRoute } from "./statusesDelete.routes";
import { registerStatusesReorderRoute } from "./statusesReorder.routes";
import { registerStatusesSeedRoute } from "./statusesSeed.routes";

export function registerSalesStatusesRoutes(app: Express, deps: Deps): void {
  registerStatusesGetAllRoute(app, deps);
  registerStatusesGetActiveRoute(app, deps);
  registerStatusesCreateRoute(app, deps);
  registerStatusesUpdateRoute(app, deps);
  registerStatusesDeleteRoute(app, deps);
  registerStatusesReorderRoute(app, deps);
  registerStatusesSeedRoute(app, deps);
}
