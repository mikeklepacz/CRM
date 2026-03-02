import type { Express } from "express";
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
import type { EngagementModuleDeps } from "./engagementModule.types";

export function registerEngagementEhubRoutes(app: Express, deps: EngagementModuleDeps): void {
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
  registerApolloManagementRoutes(app, {
    getEffectiveTenantId: deps.getEffectiveTenantId,
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
  });

  registerTestEmailRoutes(app, { isAdmin: deps.isAdmin, isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerLabelProjectsExportRoutes(app);
  registerNoSendDatesAndHolidaysRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
  });
}
