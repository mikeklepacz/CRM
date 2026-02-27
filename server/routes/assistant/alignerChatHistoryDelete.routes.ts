import type { Express } from "express";
import { storage } from "../../storage";
import type { AlignerHistoryDeps } from "./alignerHistory.types";

export function registerAlignerChatHistoryDeleteRoute(app: Express, deps: AlignerHistoryDeps): void {
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
