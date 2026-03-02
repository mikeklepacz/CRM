import type { Express } from "express";
import type { SalesCommissionsDeps as Deps } from "./commissions.types";
import { registerCommissionsListRoute } from "./commissionsList.routes";
import { registerCommissionsSummaryRoute } from "./commissionsSummary.routes";
import { registerCommissionsTeamRoute } from "./commissionsTeam.routes";

export function registerSalesCommissionsRoutes(app: Express, deps: Deps): void {
  registerCommissionsListRoute(app, deps);
  registerCommissionsSummaryRoute(app, deps);
  registerCommissionsTeamRoute(app, deps);
}
