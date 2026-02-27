import type { Express } from "express";
import type { ConversationsRouteDeps } from "./conversations.types";
import { storage } from "../../storage";
import { getTenantId, getUserId } from "./conversations.helpers";

export function registerConversationsListRoute(app: Express, deps: ConversationsRouteDeps): void {
  app.get("/api/conversations", deps.isAuthenticatedCustom, async (req: any, res) => {
      try {
          const userId = getUserId(req);
          const tenantId = getTenantId(req);
          const conversations = await storage.getConversations(userId, tenantId);
          res.json(conversations);
      }
      catch (error: any) {
          console.error("Error fetching conversations:", error);
          res.status(500).json({ message: error.message || "Failed to fetch conversations" });
      }
  });
}
