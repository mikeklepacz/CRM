import type { Express } from "express";
import type { ConversationsRouteDeps } from "./conversations.types";
import { z } from "zod";
import { storage } from "../../storage";
import { getTenantId, getUserId } from "./conversations.helpers";

export function registerConversationsMoveRoute(app: Express, deps: ConversationsRouteDeps): void {
  app.post("/api/conversations/:id/move", deps.isAuthenticatedCustom, async (req: any, res) => {
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
          const moveSchema = z.object({
              projectId: z.string().nullable(),
          });
          const validation = moveSchema.safeParse(req.body);
          if (!validation.success) {
              return res.status(400).json({ message: validation.error.errors[0].message });
          }
          const updated = await storage.moveConversationToProject(id, tenantId, validation.data.projectId);
          res.json(updated);
      }
      catch (error: any) {
          console.error("Error moving conversation:", error);
          res.status(500).json({ message: error.message || "Failed to move conversation" });
      }
  });
}
