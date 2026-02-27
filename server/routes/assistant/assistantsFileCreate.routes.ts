import type { Express } from "express";
import { storage } from "../../storage";
import type { AssistantsDeps } from "./assistants.types";

export function registerAssistantsFileCreateRoute(app: Express, deps: AssistantsDeps): void {
  app.post("/api/assistants/:assistantId/files", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { assistantId } = req.params;
      const { filename, openaiFileId, fileSize, category } = req.body;
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      const file = await storage.createAssistantFile({
        assistantId,
        filename,
        openaiFileId,
        fileSize,
        uploadedBy: userId,
        category,
      });

      res.json({ file });
    } catch (error: any) {
      console.error("[Assistants] Error uploading file:", error);
      res.status(500).json({ error: error.message || "Failed to upload file" });
    }
  });
}
