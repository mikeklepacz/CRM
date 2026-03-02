import type { Express } from "express";
import { registerCallManagerElevenLabsConfigWebhookAdminRoutes } from "../callManager/elevenLabsConfigWebhookAdmin.routes";
import { registerCallManagerElevenLabsSystemHealthRoutes } from "../callManager/elevenLabsSystemHealth.routes";
import { registerCallManagerVoiceProxyHealthRoutes } from "../callManager/voiceProxyHealth.routes";
import { registerCallManagerElevenLabsAgentsAdminRoutes } from "../callManager/elevenLabsAgentsAdmin.routes";
import { registerCallManagerElevenLabsAgentsSyncRoutes } from "../callManager/elevenLabsAgentsSync.routes";
import type { CallManagerModuleDeps } from "./callManagerModule.types";

export function registerCallManagerModuleElevenLabsAdminRoutes(app: Express, deps: CallManagerModuleDeps): void {
  registerCallManagerElevenLabsConfigWebhookAdminRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
  });
  registerCallManagerElevenLabsSystemHealthRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    checkFlyVoiceProxyHealth: deps.checkFlyVoiceProxyHealth,
  });
  registerCallManagerVoiceProxyHealthRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    checkAdminAccess: deps.checkAdminAccess,
    checkFlyVoiceProxyHealth: deps.checkFlyVoiceProxyHealth,
    voiceProxyServer: deps.voiceProxyServer,
  });
  registerCallManagerElevenLabsAgentsAdminRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    syncAgentSettingsFromElevenLabs: deps.syncAgentSettingsFromElevenLabs,
  });
  registerCallManagerElevenLabsAgentsSyncRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
  });
}
