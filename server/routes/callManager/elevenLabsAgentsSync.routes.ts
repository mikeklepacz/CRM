import type { Express } from "express";
import type { ElevenLabsAgentsSyncDeps as Deps } from "./elevenLabsAgentsSync.types";
import { registerElevenLabsAgentSyncSettingsRoute } from "./elevenLabsAgentSyncSettings.routes";
import { registerElevenLabsSyncAllAgentSettingsRoute } from "./elevenLabsSyncAllAgentSettings.routes";
import { registerElevenLabsSyncPhoneNumbersRoute } from "./elevenLabsSyncPhoneNumbers.routes";

export function registerCallManagerElevenLabsAgentsSyncRoutes(
  app: Express,
  deps: Deps
): void {
  registerElevenLabsAgentSyncSettingsRoute(app, deps);
  registerElevenLabsSyncAllAgentSettingsRoute(app, deps);
  registerElevenLabsSyncPhoneNumbersRoute(app, deps);
}
