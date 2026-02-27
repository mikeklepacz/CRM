import type { Express } from "express";
import { registerSuperAdminElevenLabsAgentsCreateRoute } from "./superAdminElevenLabsAgentsCreate.routes";
import { registerSuperAdminElevenLabsAgentsDeleteRoute } from "./superAdminElevenLabsAgentsDelete.routes";
import { registerSuperAdminElevenLabsAgentsListRoute } from "./superAdminElevenLabsAgentsList.routes";
import { registerSuperAdminElevenLabsAgentsSetDefaultRoute } from "./superAdminElevenLabsAgentsSetDefault.routes";
import { registerSuperAdminElevenLabsAgentsSyncSettingsRoute } from "./superAdminElevenLabsAgentsSyncSettings.routes";
import { registerSuperAdminElevenLabsAgentsUpdateRoute } from "./superAdminElevenLabsAgentsUpdate.routes";
import { registerSuperAdminElevenLabsPhoneNumbersListRoute } from "./superAdminElevenLabsPhoneNumbersList.routes";
import { registerSuperAdminElevenLabsSyncAllAgentSettingsRoute } from "./superAdminElevenLabsSyncAllAgentSettings.routes";
import { registerSuperAdminElevenLabsSyncPhoneNumbersRoute } from "./superAdminElevenLabsSyncPhoneNumbers.routes";
import type { SuperAdminElevenLabsAgentsRouteDeps } from "./superAdminElevenLabsAgents.types";

export function registerSuperAdminElevenLabsAgentsRoutes(
  app: Express,
  deps: SuperAdminElevenLabsAgentsRouteDeps
): void {
  registerSuperAdminElevenLabsAgentsListRoute(app, deps);
  registerSuperAdminElevenLabsPhoneNumbersListRoute(app, deps);
  registerSuperAdminElevenLabsAgentsCreateRoute(app, deps);
  registerSuperAdminElevenLabsAgentsUpdateRoute(app, deps);
  registerSuperAdminElevenLabsAgentsDeleteRoute(app, deps);
  registerSuperAdminElevenLabsAgentsSetDefaultRoute(app, deps);
  registerSuperAdminElevenLabsAgentsSyncSettingsRoute(app, deps);
  registerSuperAdminElevenLabsSyncAllAgentSettingsRoute(app, deps);
  registerSuperAdminElevenLabsSyncPhoneNumbersRoute(app, deps);
}
