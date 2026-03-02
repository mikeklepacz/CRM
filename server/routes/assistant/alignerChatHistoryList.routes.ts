import type { Express } from "express";
import { storage } from "../../storage";
import type { AlignerHistoryDeps } from "./alignerHistory.types";

export function registerAlignerChatHistoryListRoute(app: Express, deps: AlignerHistoryDeps): void {
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
}
