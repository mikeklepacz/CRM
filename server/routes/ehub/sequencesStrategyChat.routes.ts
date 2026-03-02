import type { Express } from "express";
import type { SequencesStrategyChatDeps as Deps } from "./sequencesStrategyChat.types";
import { registerSequencesStrategyChatGetRoute } from "./sequencesStrategyChatGet.routes";
import { registerSequencesStrategyChatPostRoute } from "./sequencesStrategyChatPost.routes";

export function registerEhubSequencesStrategyChatRoutes(
  app: Express,
  deps: Deps
): void {
  registerSequencesStrategyChatGetRoute(app, deps);
  registerSequencesStrategyChatPostRoute(app, deps);
}
