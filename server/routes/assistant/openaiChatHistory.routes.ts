import type { Express } from "express";
import { storage } from "../../storage";

type Deps = {
  isAuthenticatedCustom: any;
};

export function registerOpenaiChatHistoryRoutes(app: Express, deps: Deps): void {
  // Get chat history
  app.get("/api/openai/chat/history", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      console.log("💬 [HISTORY] Starting GET request...");

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const limit = parseInt(req.query.limit as string) || 50;
      console.log("💬 [HISTORY] Request details:", {
        userId,
        limit,
      });

      console.log("💬 [HISTORY] Fetching chat history from database...");
      const history = await storage.getChatHistory(userId, tenantId, limit);
      console.log("💬 [HISTORY] Chat history retrieved:", {
        messageCount: history.length,
        hasMessages: history.length > 0,
      });

      const reversedHistory = history.reverse();
      console.log("💬 [HISTORY] ✅ Sending chat history to client");
      res.json(reversedHistory);
    } catch (error: any) {
      console.error("💬 [HISTORY] ❌ ERROR:", error.message);
      console.error("💬 [HISTORY] Stack trace:", error.stack);
      console.error("💬 [HISTORY] Full error object:", error);
      res.status(500).json({ message: error.message || "Failed to fetch chat history" });
    }
  });

  // Clear chat history
  app.delete("/api/openai/chat/history", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      console.log("💬 [CLEAR HISTORY] Starting DELETE request...");

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      console.log("💬 [CLEAR HISTORY] User ID:", userId);

      console.log("💬 [CLEAR HISTORY] Clearing chat history from database...");
      await storage.clearChatHistory(userId, tenantId);
      console.log("💬 [CLEAR HISTORY] Chat history cleared successfully");

      console.log("💬 [CLEAR HISTORY] ✅ Sending success response");
      res.json({ success: true });
    } catch (error: any) {
      console.error("💬 [CLEAR HISTORY] ❌ ERROR:", error.message);
      console.error("💬 [CLEAR HISTORY] Stack trace:", error.stack);
      console.error("💬 [CLEAR HISTORY] Full error object:", error);
      res.status(500).json({ message: error.message || "Failed to clear chat history" });
    }
  });
}
