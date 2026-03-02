import type { Express } from "express";
import { createGmailDraft } from "../../services/docs/gmailDraftService";

type Deps = {
  isAuthenticatedCustom: any;
};

export function registerGmailDraftRoutes(app: Express, deps: Deps): void {
  app.post("/api/gmail/create-draft", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const payload = await createGmailDraft({
        authUser: req.user,
        body: req.body,
      });
      res.json(payload);
    } catch (error: any) {
      if (
        error.message === "Missing required fields: to, subject, body" ||
        error.message ===
          "Email contains invalid bracket-style placeholders like [recipient email]. Please use {{variable}} format instead." ||
        error.message === "Invalid email address or unreplaced placeholder in To field." ||
        error.message === "Gmail not connected. Please connect Gmail in Settings." ||
        error.message === "Gmail token expired. Please reconnect Gmail in Settings." ||
        error.message === "Failed to refresh Gmail token. Please reconnect Gmail in Settings."
      ) {
        return res.status(400).json({ message: error.message });
      }
      if (error.message === "System OAuth not configured. Please contact administrator.") {
        return res.status(500).json({ message: error.message });
      }
      console.error("Error creating Gmail draft:", error);
      res.status(500).json({ message: error.message || "Failed to create Gmail draft" });
    }
  });
}
