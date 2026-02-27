import type { Express } from "express";
import type { IntegrationsDeps as Deps } from "./integrations.types";
import { registerIntegrationsStatusRoute } from "./integrationsStatus.routes";
import { registerIntegrationsGoogleCalendarConnectRoute } from "./integrationsGoogleCalendarConnect.routes";
import { registerIntegrationsGoogleSheetsDisconnectRoute } from "./integrationsGoogleSheetsDisconnect.routes";
import { registerIntegrationsGoogleCalendarDisconnectRoute } from "./integrationsGoogleCalendarDisconnect.routes";

export function registerIntegrationsRoutes(app: Express, deps: Deps): void {
  registerIntegrationsStatusRoute(app, deps);
  registerIntegrationsGoogleCalendarConnectRoute(app, deps);
  registerIntegrationsGoogleSheetsDisconnectRoute(app, deps);
  registerIntegrationsGoogleCalendarDisconnectRoute(app, deps);
}
