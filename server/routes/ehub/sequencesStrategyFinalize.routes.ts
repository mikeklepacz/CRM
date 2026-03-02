import type { Express } from "express";
import type { SequencesStrategyFinalizeDeps as Deps } from "./sequencesStrategyFinalize.types";
import { registerSequencesStrategyFinalizePostRoute } from "./sequencesStrategyFinalizePost.routes";
import { registerSequencesStrategyFinalizePatchRoute } from "./sequencesStrategyFinalizePatch.routes";

export function registerEhubSequencesStrategyFinalizeRoutes(
  app: Express,
  deps: Deps
): void {
  registerSequencesStrategyFinalizePostRoute(app, deps);
  registerSequencesStrategyFinalizePatchRoute(app, deps);
}
