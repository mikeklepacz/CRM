import type { Express } from "express";
import { storage } from "../../storage";

type Deps = {
  isAdmin: any;
  isAuthenticatedCustom: any;
};

export function registerAlignerHistoryRoutes(app: Express, deps: Deps): void {
  // Get all Aligner conversations
  app.get("/api/aligner/chat/history", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;

      const conversations = await storage.getConversations(userId, tenantId);
      const alignerConversations = conversations.filter((conversation: any) => conversation.assistantType === "aligner");

      alignerConversations.sort(
        (first: any, second: any) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
      );

      res.json(alignerConversations);
    } catch (error: any) {
      console.error("[Aligner Chat] Error fetching conversations:", error);
      res.status(500).json({ error: error.message || "Failed to fetch conversations" });
    }
  });

  // Get messages for a specific Aligner conversation
  app.get(
    "/api/aligner/conversations/:id/messages",
    deps.isAuthenticatedCustom,
    deps.isAdmin,
    async (req: any, res) => {
      try {
        const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
        const tenantId = req.user.tenantId;
        const conversationId = req.params.id;

        const conversation = await storage.getConversation(conversationId, tenantId);
        if (!conversation) {
          return res.status(404).json({ error: "Conversation not found" });
        }
        if (conversation.userId !== userId) {
          return res.status(403).json({ error: "Unauthorized" });
        }
        if (conversation.assistantType !== "aligner") {
          return res.status(400).json({ error: "Not an Aligner conversation" });
        }

        const messages = await storage.getConversationMessages(conversationId, tenantId);
        res.json(messages);
      } catch (error: any) {
        console.error("[Aligner Chat] Error fetching messages:", error);
        res.status(500).json({ error: error.message || "Failed to fetch messages" });
      }
    }
  );

  // Clear Aligner chat history
  app.delete("/api/aligner/chat/history", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;

      const conversations = await storage.getConversations(userId, tenantId);
      const alignerConversations = conversations.filter((conversation: any) => conversation.assistantType === "aligner");

      for (const conversation of alignerConversations) {
        await storage.deleteConversation(conversation.id, tenantId);
      }

      res.json({ success: true, deletedCount: alignerConversations.length });
    } catch (error: any) {
      console.error("[Aligner Chat] Error clearing history:", error);
      res.status(500).json({ error: error.message || "Failed to clear chat history" });
    }
  });
}
