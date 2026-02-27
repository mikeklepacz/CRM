import type { Express } from "express";
import type { AlignerHistoryDeps as Deps } from "./alignerHistory.types";
import { registerAlignerChatHistoryListRoute } from "./alignerChatHistoryList.routes";
import { registerAlignerConversationMessagesRoute } from "./alignerConversationMessages.routes";
import { registerAlignerChatHistoryDeleteRoute } from "./alignerChatHistoryDelete.routes";

export function registerAlignerHistoryRoutes(app: Express, deps: Deps): void {
  registerAlignerChatHistoryListRoute(app, deps);
  registerAlignerConversationMessagesRoute(app, deps);
  registerAlignerChatHistoryDeleteRoute(app, deps);
}
