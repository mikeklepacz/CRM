import type { Express } from "express";
import type { TwilioVoipDeps as Deps } from "./twilioVoip.types";
import { registerTwilioCallStatusRoute } from "./twilioCallStatus.routes";
import { registerTwilioVoipTokenRoute } from "./twilioVoipToken.routes";
import { registerTwilioVoipCheckRoute } from "./twilioVoipCheck.routes";
import { registerTwilioVoipTwimlRoute } from "./twilioVoipTwiml.routes";
import { registerTwilioVoipStatusRoute } from "./twilioVoipStatus.routes";

export function registerCallManagerTwilioVoipRoutes(
  app: Express,
  deps: Deps
): void {
  registerTwilioCallStatusRoute(app, deps);
  registerTwilioVoipTokenRoute(app, deps);
  registerTwilioVoipCheckRoute(app, deps);
  registerTwilioVoipTwimlRoute(app, deps);
  registerTwilioVoipStatusRoute(app, deps);
}
