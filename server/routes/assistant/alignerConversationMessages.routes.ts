import type { Express } from "express";
import { storage } from "../../storage";
import type { AlignerHistoryDeps } from "./alignerHistory.types";

export function registerAlignerConversationMessagesRoute(app: Express, deps: AlignerHistoryDeps): void {
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
}
