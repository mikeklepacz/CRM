import type { Express } from "express";
import { registerCallManagerTwilioVoipRoutes } from "../callManager/twilioVoip.routes";
import { registerCallManagerOutboundCallingRoutes } from "../callManager/outboundCalling.routes";
import { registerCallManagerSessionsRoutes } from "../callManager/callSessions.routes";
import { registerCallManagerHistoryEnrichedRoutes } from "../callManager/callHistoryEnriched.routes";
import { registerCallManagerVoiceProxyAudioRoutes } from "../callManager/voiceProxyAudio.routes";
import type { CallManagerModuleDeps } from "./callManagerModule.types";

export function registerCallManagerModuleCoreRoutes(app: Express, deps: CallManagerModuleDeps): void {
  registerCallManagerTwilioVoipRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerCallManagerOutboundCallingRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    checkAdminAccess: deps.checkAdminAccess,
  });
  registerCallManagerSessionsRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    checkAdminAccess: deps.checkAdminAccess,
  });
  registerCallManagerHistoryEnrichedRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    checkAdminAccess: deps.checkAdminAccess,
  });
  registerCallManagerVoiceProxyAudioRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
  });
}
