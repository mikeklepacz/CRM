import OpenAI from "openai";
import { runOpenaiSalesAssistant } from "./openaiChatAssistant.service";
import { buildOpenaiChatSystemInstructions } from "./openaiChatInstructions.service";

export function createOpenaiChatHandler(storage: any) {
  return async (req: any, res: any) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { message, conversationId, contextData } = req.body;
      if (!message) {
        return res.status(400).json({ message: "Message required" });
      }

      const tenantId = (req.user as any).tenantId;
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const newConversation = await storage.createConversation({
          userId,
          tenantId,
          title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
          contextData: contextData || {},
          projectId: null,
        });
        activeConversationId = newConversation.id;
      } else if (contextData) {
        await storage.updateConversation(activeConversationId, tenantId, { contextData });
      }

      const settings = await storage.getOpenaiSettings(req.user.tenantId);
      if (!settings?.apiKey) {
        return res.status(400).json({ message: "OpenAI API key not configured" });
      }

      const openai = new OpenAI({ apiKey: settings.apiKey });
      const conversation = await storage.getConversation(activeConversationId, tenantId);
      const contextInfo = conversation?.contextData as any;

      await storage.saveChatMessage({
        userId,
        tenantId,
        conversationId: activeConversationId,
        role: "user",
        content: message,
        responseId: null,
        metadata: {},
      });

      const currentUser = await storage.getUser(userId);
      const selectedCategory = await storage.getSelectedCategory(userId, tenantId);
      const systemInstructions = buildOpenaiChatSystemInstructions({
        aiInstructions: settings.aiInstructions,
        contextInfo,
        currentUser,
        selectedCategory,
      });

      const { assistantMessage, responseId } = await runOpenaiSalesAssistant({
        conversationId: activeConversationId,
        conversationThreadId: conversation?.threadId || null,
        message,
        openai,
        settings,
        storage,
        systemInstructions,
        tenantId,
      });

      await storage.saveChatMessage({
        userId,
        tenantId,
        conversationId: activeConversationId,
        role: "assistant",
        content: assistantMessage,
        responseId,
        metadata: {
          model: "gpt-4o",
          tokensUsed: 0,
        },
      });

      return res.json({
        message: assistantMessage,
        responseId,
        conversationId: activeConversationId,
      });
    } catch (error: any) {
      console.error("[CHAT] ERROR:", error.message);
      return res.status(500).json({ message: error.message || "Failed to get AI response" });
    }
  };
}
