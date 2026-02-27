import type { Express } from "express";
import type { ConversationsRouteDeps } from "./conversations.types";
import { storage } from "../../storage";
import { getTenantId, getUserId } from "./conversations.helpers";

export function registerConversationsMessagesRoute(app: Express, deps: ConversationsRouteDeps): void {
  app.get("/api/conversations/:id/messages", deps.isAuthenticatedCustom, async (req: any, res) => {
      try {
          const { id } = req.params;
          const userId = getUserId(req);
          const tenantId = getTenantId(req);
          const conversation = await storage.getConversation(id, tenantId);
          if (!conversation) {
              return res.status(404).json({ message: "Conversation not found" });
          }
          if (conversation.userId !== userId) {
              return res.status(403).json({ message: "Unauthorized" });
          }
          const messages = await storage.getConversationMessages(id, tenantId);
          res.json(messages);
      }
      catch (error: any) {
          console.error("Error fetching conversation messages:", error);
          res.status(500).json({ message: error.message || "Failed to fetch messages" });
      }
  });
}
