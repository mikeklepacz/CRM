import type { Express } from "express";
import type { ConversationsRouteDeps } from "./conversations.types";
import { storage } from "../../storage";
import { getTenantId, getUserId } from "./conversations.helpers";

export function registerConversationsExportRoute(app: Express, deps: ConversationsRouteDeps): void {
  app.get("/api/conversations/:id/export", deps.isAuthenticatedCustom, async (req: any, res) => {
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
          const messages = await storage.getConversationMessages(id, tenantId);
          let exportText = `Conversation: ${conversation.title}\n`;
          exportText += `Created: ${conversation.createdAt}\n\n`;
          if (conversation.contextData) {
              exportText += "Context:\n";
              Object.entries(conversation.contextData).forEach(([key, value]) => {
                  exportText += `  ${key}: ${value}\n`;
              });
              exportText += "\n";
          }
          exportText += `Messages:\n${"=".repeat(50)}\n\n`;
          messages.forEach((message: any) => {
              exportText += `[${message.role.toUpperCase()}] ${new Date(message.createdAt).toLocaleString()}\n`;
              exportText += `${message.content}\n\n`;
          });
          res.setHeader("Content-Type", "text/plain");
          res.setHeader("Content-Disposition", `attachment; filename="conversation-${id}.txt"`);
          res.send(exportText);
      }
      catch (error: any) {
          console.error("Error exporting conversation:", error);
          res.status(500).json({ message: error.message || "Failed to export conversation" });
      }
  });
}
