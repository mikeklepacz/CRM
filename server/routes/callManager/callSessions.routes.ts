import type { Express } from "express";
import type { CallSessionsDeps as Deps } from "./callSessions.types";
import { registerCallSessionsListRoute } from "./callSessionsList.routes";
import { registerCallSessionsGetByConversationRoute } from "./callSessionsGetByConversation.routes";

export function registerCallManagerSessionsRoutes(app: Express, deps: Deps): void {
  registerCallSessionsListRoute(app, deps);
  registerCallSessionsGetByConversationRoute(app, deps);
}
