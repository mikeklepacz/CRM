import type { Express } from "express";
import type { ConversationsRouteDeps } from "./conversations.types";
import { storage } from "../../storage";
import { getTenantId, getUserId } from "./conversations.helpers";

export function registerConversationsDeleteRoute(app: Express, deps: ConversationsRouteDeps): void {
  app.delete("/api/conversations/:id", deps.isAuthenticatedCustom, async (req: any, res) => {
      try {
          const userId = getUserId(req);
          const tenantId = getTenantId(req);
          const conversationId = req.params.id;
          const conversation = await storage.getConversation(conversationId, tenantId);
          if (!conversation) {
              return res.status(404).json({ error: "Conversation not found" });
          }
          if (conversation.userId !== userId) {
              return res.status(403).json({ error: "Unauthorized" });
          }
          await storage.deleteConversation(conversationId, tenantId);
          res.json({ success: true });
      }
      catch (error: any) {
          console.error("[Conversation] Error deleting conversation:", error);
          res.status(500).json({ error: error.message || "Failed to delete conversation" });
      }
  });
}
