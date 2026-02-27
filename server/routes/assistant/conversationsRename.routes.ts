import type { Express } from "express";
import type { ConversationsRouteDeps } from "./conversations.types";
import { storage } from "../../storage";
import { getTenantId, getUserId } from "./conversations.helpers";

export function registerConversationsRenameRoute(app: Express, deps: ConversationsRouteDeps): void {
  app.post("/api/conversations/:id/rename", deps.isAuthenticatedCustom, async (req: any, res) => {
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
          const { title } = req.body;
          if (!title || !title.trim()) {
              return res.status(400).json({ message: "Title is required" });
          }
          const updated = await storage.updateConversation(id, tenantId, { title: title.trim() });
          res.json(updated);
      }
      catch (error: any) {
          console.error("Error renaming conversation:", error);
          res.status(500).json({ message: error.message || "Failed to rename conversation" });
      }
  });
}
