import type { Express } from "express";
import type { IntegrationsDeps } from "./integrations.types";
import { handleIntegrationsGoogleCalendarDisconnect } from "./integrationsGoogleCalendarDisconnect.handler";

export function registerIntegrationsGoogleCalendarDisconnectRoute(app: Express, deps: IntegrationsDeps): void {
  app.post("/api/integrations/google-calendar/disconnect", deps.isAuthenticatedCustom, async (req: any, res) => {
    await handleIntegrationsGoogleCalendarDisconnect(req, res);
  });
}
