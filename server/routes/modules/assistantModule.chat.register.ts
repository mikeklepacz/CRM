import type { Express } from "express";
import { registerOpenaiChatRoutes } from "../assistant/openaiChat.routes";
import { registerConversationsRoutes } from "../assistant/conversations.routes";
import type { AssistantModuleDeps } from "./assistantModule.types";

export function registerAssistantChatRoutes(app: Express, deps: AssistantModuleDeps, handleOpenaiChat: any): void {
  registerOpenaiChatRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom, handleOpenaiChat });
  registerConversationsRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
}
