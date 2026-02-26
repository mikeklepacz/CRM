import type { Express } from "express";
import { storage } from "../../storage";

type Deps = {
  isAuthenticatedCustom: any;
  isAdmin: any;
};

export function registerAssistantsRoutes(app: Express, deps: Deps): void {
  // Get all assistants
  app.get("/api/assistants", deps.isAuthenticatedCustom, deps.isAdmin, async (_req: any, res) => {
    try {
      const assistants = await storage.getAllAssistants();
      res.json({ assistants });
    } catch (error: any) {
      console.error("[Assistants] Error fetching assistants:", error);
      res.status(500).json({ error: error.message || "Failed to fetch assistants" });
    }
  });

  // Get assistant by slug
  app.get("/api/assistants/:slug", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { slug } = req.params;
      const tenantId = req.user.tenantId;
      const assistant = await storage.getAssistantBySlug(slug, tenantId);

      if (!assistant) {
        return res.status(404).json({ error: "Assistant not found" });
      }

      const files = await storage.getAssistantFiles(assistant.id);
      res.json({
        assistant: {
          ...assistant,
          files,
        },
      });
    } catch (error: any) {
      console.error("[Assistants] Error fetching assistant:", error);
      res.status(500).json({ error: error.message || "Failed to fetch assistant" });
    }
  });

  // Update assistant
  app.patch("/api/assistants/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const assistant = await storage.updateAssistant(id, updates);
      res.json({ assistant });
    } catch (error: any) {
      console.error("[Assistants] Error updating assistant:", error);
      res.status(500).json({ error: error.message || "Failed to update assistant" });
    }
  });

  // Upload file to assistant
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

  // Delete file from assistant
  app.delete(
    "/api/assistants/:assistantId/files/:fileId",
    deps.isAuthenticatedCustom,
    deps.isAdmin,
    async (req: any, res) => {
      try {
        const { assistantId, fileId } = req.params;
        const deleted = await storage.deleteAssistantFileByAssistantId(fileId, assistantId);

        if (!deleted) {
          return res.status(404).json({ error: "File not found or does not belong to this assistant" });
        }

        res.json({ success: true });
      } catch (error: any) {
        console.error("[Assistants] Error deleting file:", error);
        res.status(500).json({ error: error.message || "Failed to delete file" });
      }
    }
  );
}
