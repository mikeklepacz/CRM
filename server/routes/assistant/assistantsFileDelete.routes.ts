import type { Express } from "express";
import { storage } from "../../storage";
import type { AssistantsDeps } from "./assistants.types";

export function registerAssistantsFileDeleteRoute(app: Express, deps: AssistantsDeps): void {
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
