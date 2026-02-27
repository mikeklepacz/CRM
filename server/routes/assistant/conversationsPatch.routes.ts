import type { Express } from "express";
import type { ConversationsRouteDeps } from "./conversations.types";
import { z } from "zod";
import { storage } from "../../storage";
import { getTenantId, getUserId } from "./conversations.helpers";

export function registerConversationsPatchRoute(app: Express, deps: ConversationsRouteDeps): void {
  app.patch("/api/conversations/:id", deps.isAuthenticatedCustom, async (req: any, res) => {
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
          const updateSchema = z.object({
              title: z.string().min(1).optional(),
              contextData: z.record(z.any()).optional(),
          });
          const validation = updateSchema.safeParse(req.body);
          if (!validation.success) {
              return res.status(400).json({ message: validation.error.errors[0].message });
          }
          const updated = await storage.updateConversation(id, tenantId, validation.data);
          res.json(updated);
      }
      catch (error: any) {
          console.error("Error updating conversation:", error);
          res.status(500).json({ message: error.message || "Failed to update conversation" });
      }
  });
}
