import type { Express } from "express";
import type { CallInsightsAdminDeps } from "./callInsightsAdmin.types";
import { handleNukeCallData } from "./nukeCallData.handler";

export function registerNukeCallDataRoute(app: Express, deps: CallInsightsAdminDeps): void {
  app.post("/api/elevenlabs/nuke-call-data", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    await handleNukeCallData(req, res);
  });
}
