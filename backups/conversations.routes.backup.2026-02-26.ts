import type { Express } from "express";
import { z } from "zod";
import { insertConversationSchema } from "@shared/schema";
import { storage } from "../../storage";

type Deps = {
  isAuthenticatedCustom: any;
};

function getUserId(req: any): string {
  return req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
}

function getTenantId(req: any): string {
  return req.user.tenantId;
}

export function registerConversationsRoutes(app: Express, deps: Deps): void {
  app.get("/api/conversations", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const tenantId = getTenantId(req);
      const conversations = await storage.getConversations(userId, tenantId);
      res.json(conversations);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: error.message || "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", deps.isAuthenticatedCustom, async (req: any, res) => {
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
      res.json({ ...conversation, messages });
    } catch (error: any) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: error.message || "Failed to fetch conversation" });
    }
  });

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
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: error.message || "Failed to create conversation" });
    }
  });

  app.get("/api/conversations/:id/messages", deps.isAuthenticatedCustom, async (req: any, res) => {
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
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching conversation messages:", error);
      res.status(500).json({ message: error.message || "Failed to fetch messages" });
    }
  });

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
    } catch (error: any) {
      console.error("Error renaming conversation:", error);
      res.status(500).json({ message: error.message || "Failed to rename conversation" });
    }
  });

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
    } catch (error: any) {
      console.error("Error updating conversation:", error);
      res.status(500).json({ message: error.message || "Failed to update conversation" });
    }
  });

  app.delete("/api/conversations/:id", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const tenantId = getTenantId(req);
      const conversationId = req.params.id;

      const conversation = await storage.getConversation(conversationId, tenantId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      if (conversation.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await storage.deleteConversation(conversationId, tenantId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Conversation] Error deleting conversation:", error);
      res.status(500).json({ error: error.message || "Failed to delete conversation" });
    }
  });

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
    } catch (error: any) {
      console.error("Error moving conversation:", error);
      res.status(500).json({ message: error.message || "Failed to move conversation" });
    }
  });

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
    } catch (error: any) {
      console.error("Error exporting conversation:", error);
      res.status(500).json({ message: error.message || "Failed to export conversation" });
    }
  });
}
