import type { Express } from "express";
import type { SequencesStrategyChatDeps } from "./sequencesStrategyChat.types";
import { handleSequencesStrategyChatPost } from "./sequencesStrategyChatPost.handler";

export function registerSequencesStrategyChatPostRoute(app: Express, deps: SequencesStrategyChatDeps): void {
  app.post("/api/sequences/:id/strategy-chat", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    await handleSequencesStrategyChatPost(req, res);
  });
}
