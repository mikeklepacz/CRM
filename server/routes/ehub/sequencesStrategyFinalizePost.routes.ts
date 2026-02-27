import type { Express } from "express";
import type { SequencesStrategyFinalizeDeps } from "./sequencesStrategyFinalize.types";
import { handleSequencesStrategyFinalizePost } from "./sequencesStrategyFinalizePost.handler";

export function registerSequencesStrategyFinalizePostRoute(app: Express, deps: SequencesStrategyFinalizeDeps): void {
  app.post("/api/sequences/:id/finalize-strategy", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    await handleSequencesStrategyFinalizePost(req, res);
  });
}
