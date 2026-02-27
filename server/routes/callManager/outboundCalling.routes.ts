import type { Express } from "express";
import type { OutboundCallingDeps as Deps } from "./outboundCalling.types";
import { registerOutboundInitiateCallRoute } from "./outboundInitiateCall.routes";
import { registerOutboundPhoneNumbersRoute } from "./outboundPhoneNumbers.routes";
import { registerOutboundAgentsRoute } from "./outboundAgents.routes";
import { registerVoiceTodayBlockedRoute } from "./voiceTodayBlocked.routes";

export function registerCallManagerOutboundCallingRoutes(
  app: Express,
  deps: Deps
): void {
  registerOutboundInitiateCallRoute(app, deps);
  registerOutboundPhoneNumbersRoute(app, deps);
  registerOutboundAgentsRoute(app, deps);
  registerVoiceTodayBlockedRoute(app, deps);
}
