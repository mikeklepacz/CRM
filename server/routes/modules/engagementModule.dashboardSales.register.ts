import type { Express } from "express";
import { registerDbaRoutes } from "../../dba-routes";
import { registerOrderRoutes } from "../orders.routes";
import { registerSalesCommissionsRoutes } from "../sales/commissions.routes";
import { registerAnalyticsDashboardSummaryRoutes } from "../dashboard/analyticsDashboardSummary.routes";
import { registerAnalyticsCommissionBreakdownRoutes } from "../dashboard/analyticsCommissionBreakdown.routes";
import { registerAnalyticsPortfolioMetricsRoutes } from "../dashboard/analyticsPortfolioMetrics.routes";
import { registerAnalyticsTopClientsRoutes } from "../dashboard/analyticsTopClients.routes";
import { registerNotificationsRoutes } from "../dashboard/notifications.routes";
import { registerIntegrationsRoutes } from "../dashboard/integrations.routes";
import { registerWidgetLayoutRoutes } from "../dashboard/widgetLayout.routes";
import { registerSalesProjectsRoutes } from "../sales/projects.routes";
import { registerSalesTemplatesRoutes } from "../sales/templates.routes";
import { registerSalesUserTagsRoutes } from "../sales/userTags.routes";
import { registerSalesCategoriesRoutes } from "../sales/categories.routes";
import { registerSalesStatusesRoutes } from "../sales/statuses.routes";
import { registerSalesExclusionsRoutes } from "../sales/exclusions.routes";
import type { EngagementModuleDeps } from "./engagementModule.types";

export function registerEngagementDashboardSalesRoutes(app: Express, deps: EngagementModuleDeps): void {
  registerOrderRoutes(app, { isAdmin: deps.isAdmin, isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerSalesCommissionsRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });

  registerDbaRoutes(app, deps.storage, deps.googleSheets, deps.isAuthenticatedCustom, deps.clearUserCache);

  registerAnalyticsDashboardSummaryRoutes(app);
  registerAnalyticsCommissionBreakdownRoutes(app);
  registerAnalyticsPortfolioMetricsRoutes(app);
  registerAnalyticsTopClientsRoutes(app);
  registerNotificationsRoutes(app);
  registerIntegrationsRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerWidgetLayoutRoutes(app);

  registerSalesProjectsRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerSalesTemplatesRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerSalesUserTagsRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerSalesCategoriesRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom, isAdmin: deps.isAdmin });
  registerSalesStatusesRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom, isAdmin: deps.isAdmin });
  registerSalesExclusionsRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
}
