import type { Express } from "express";
import { registerConversationsCreateRoute } from "./conversationsCreate.routes";
import { registerConversationsDeleteRoute } from "./conversationsDelete.routes";
import { registerConversationsExportRoute } from "./conversationsExport.routes";
import { registerConversationsGetByIdRoute } from "./conversationsGetById.routes";
import { registerConversationsListRoute } from "./conversationsList.routes";
import { registerConversationsMessagesRoute } from "./conversationsMessages.routes";
import { registerConversationsMoveRoute } from "./conversationsMove.routes";
import { registerConversationsPatchRoute } from "./conversationsPatch.routes";
import { registerConversationsRenameRoute } from "./conversationsRename.routes";
import type { ConversationsRouteDeps } from "./conversations.types";

export function registerConversationsRoutes(app: Express, deps: ConversationsRouteDeps): void {
  registerConversationsListRoute(app, deps);
  registerConversationsGetByIdRoute(app, deps);
  registerConversationsCreateRoute(app, deps);
  registerConversationsMessagesRoute(app, deps);
  registerConversationsRenameRoute(app, deps);
  registerConversationsPatchRoute(app, deps);
  registerConversationsDeleteRoute(app, deps);
  registerConversationsMoveRoute(app, deps);
  registerConversationsExportRoute(app, deps);
}
