import type { Express } from "express";
import { registerEhubSequencesStrategyChatRoutes } from "./sequencesStrategyChat.routes";
import { registerEhubSequencesStrategyFinalizeRoutes } from "./sequencesStrategyFinalize.routes";

export function registerEhubSequencesStrategyRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any }
): void {
  registerEhubSequencesStrategyChatRoutes(app, deps);
  registerEhubSequencesStrategyFinalizeRoutes(app, deps);
}
