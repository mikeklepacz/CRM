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
import { registerTicketsReadRoutes } from "../docs/ticketsRead.routes";
import { registerTicketsWriteRoutes } from "../docs/ticketsWrite.routes";
import { registerSuperAdminTicketsWebhooksRoutes } from "../platform/superAdminTicketsWebhooks.routes";
import { registerAdminWebhooksRoutes } from "../admin/adminWebhooks.routes";
import { registerFollowUpRoutes } from "../followup.routes";
import { registerDriveRoutes } from "../docs/drive.routes";
import { registerEhubQueueRecipientsRoutes } from "../ehub/ehubQueueRecipients.routes";
import { registerEhubOperationsRoutes } from "../ehub/ehubOperations.routes";
import { registerEhubBlacklistRoutes } from "../ehub/ehubBlacklist.routes";
import { registerEhubSequencesCoreRoutes } from "../ehub/sequencesCore.routes";
import { registerEhubSequencesStrategyRoutes } from "../ehub/sequencesStrategy.routes";
import { registerEhubSequencesConfigRoutes } from "../ehub/sequencesConfig.routes";
import { registerEhubSequencesSyntheticTestRoutes } from "../ehub/sequencesSyntheticTest.routes";
import { registerEhubSequencesRecipientsReadRoutes } from "../ehub/sequencesRecipientsRead.routes";
import { registerEhubSequencesRecipientsWriteRoutes } from "../ehub/sequencesRecipientsWrite.routes";
import { registerApolloManagementRoutes } from "../apollo/apolloManagement.routes";
import { registerTestEmailRoutes } from "../ehub/testEmail.routes";
import { registerLabelProjectsExportRoutes } from "../labelDesigner/labelProjectsExport.routes";
import { registerNoSendDatesAndHolidaysRoutes } from "../ehub/noSendDatesHolidays.routes";

type Deps = {
  checkAdminAccess: any;
  clearUserCache: any;
  googleSheets: any;
  isAdmin: any;
  isAuthenticatedCustom: any;
  storage: any;
};

export function registerEngagementModuleRoutes(app: Express, deps: Deps): void {
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

  registerTicketsReadRoutes(app, {
    checkAdminAccess: deps.checkAdminAccess,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
  });
  registerTicketsWriteRoutes(app, {
    checkAdminAccess: deps.checkAdminAccess,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
  });
  registerSuperAdminTicketsWebhooksRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerAdminWebhooksRoutes(app, { isAdmin: deps.isAdmin, isAuthenticatedCustom: deps.isAuthenticatedCustom });

  registerFollowUpRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerDriveRoutes(app, { isAdmin: deps.isAdmin, isAuthenticatedCustom: deps.isAuthenticatedCustom });

  registerEhubQueueRecipientsRoutes(app, { isAdmin: deps.isAdmin, isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerEhubOperationsRoutes(app, { isAdmin: deps.isAdmin, isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerEhubBlacklistRoutes(app, { isAdmin: deps.isAdmin, isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerEhubSequencesCoreRoutes(app, { isAdmin: deps.isAdmin, isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerEhubSequencesStrategyRoutes(app, { isAdmin: deps.isAdmin, isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerEhubSequencesConfigRoutes(app, { isAdmin: deps.isAdmin, isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerEhubSequencesSyntheticTestRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
  });
  registerEhubSequencesRecipientsReadRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
  });
  registerEhubSequencesRecipientsWriteRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
  });
  registerApolloManagementRoutes(app, { isAdmin: deps.isAdmin, isAuthenticatedCustom: deps.isAuthenticatedCustom });

  registerTestEmailRoutes(app, { isAdmin: deps.isAdmin, isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerLabelProjectsExportRoutes(app);
  registerNoSendDatesAndHolidaysRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
  });
}
