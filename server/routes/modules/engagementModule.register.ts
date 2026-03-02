import type { Express } from "express";
import { registerEngagementDashboardSalesRoutes } from "./engagementModule.dashboardSales.register";
import { registerEngagementDocsOpsRoutes } from "./engagementModule.docsOps.register";
import { registerEngagementEhubRoutes } from "./engagementModule.ehub.register";
import type { EngagementModuleDeps as Deps } from "./engagementModule.types";

export function registerEngagementModuleRoutesImpl(app: Express, deps: Deps): void {
  registerEngagementDashboardSalesRoutes(app, deps);
  registerEngagementDocsOpsRoutes(app, deps);
  registerEngagementEhubRoutes(app, deps);
}
