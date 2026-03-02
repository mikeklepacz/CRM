import type { Express } from "express";
import type { ConversationsRouteDeps } from "./conversations.types";
import { insertConversationSchema } from "@shared/schema";
import { storage } from "../../storage";
import { getTenantId, getUserId } from "./conversations.helpers";

export function registerConversationsCreateRoute(app: Express, deps: ConversationsRouteDeps): void {
  app.post("/api/conversations", deps.isAuthenticatedCustom, async (req: any, res) => {
      try {
          const userId = getUserId(req);
          const tenantId = getTenantId(req);
          const validation = insertConversationSchema.safeParse({ ...req.body, userId, tenantId });
          if (!validation.success) {
              return res.status(400).json({ message: validation.error.errors[0].message });
          }
          const conversation = await storage.createConversation(validation.data);
          res.json(conversation);
      }
      catch (error: any) {
          console.error("Error creating conversation:", error);
          res.status(500).json({ message: error.message || "Failed to create conversation" });
      }
  });
}
