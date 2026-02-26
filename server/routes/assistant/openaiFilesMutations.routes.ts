import type { Express } from "express";
import OpenAI from "openai";
import { storage } from "../../storage";

type Deps = {
  checkAdminAccess: (user: any, tenantId: string | undefined) => Promise<boolean>;
  isAuthenticated: any;
};

export function registerOpenaiFilesMutationsRoutes(app: Express, deps: Deps): void {
  // Update knowledge base file metadata
  app.put("/api/openai/files/:id", deps.isAuthenticated, async (req: any, res) => {
    try {
      console.log("📝 [EDIT FILE] Starting PUT request...");

      const user = await storage.getUser(req.user.isPasswordAuth ? req.user.id : req.user.claims.sub);
      const isAdminUser = await deps.checkAdminAccess(user, req.user.tenantId);
      if (!isAdminUser) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const { category, productCategory, description } = req.body;
      console.log("📝 [EDIT FILE] Updating file:", id);
      console.log("📝 [EDIT FILE] New values:", { category, productCategory, description });

      const updates: any = {};
      if (category !== undefined) updates.category = category;
      if (productCategory !== undefined) updates.productCategory = productCategory;
      if (description !== undefined) updates.description = description;

      const updatedFile = await storage.updateKnowledgeBaseFile(id, req.user.tenantId, updates);
      console.log("📝 [EDIT FILE] File updated successfully");
      res.json(updatedFile);
    } catch (error: any) {
      console.error("📝 [EDIT FILE] ❌ ERROR:", error.message);
      res.status(500).json({ message: error.message || "Failed to update file" });
    }
  });

  // Delete knowledge base file
  app.delete("/api/openai/files/:id", deps.isAuthenticated, async (req: any, res) => {
    try {
      console.log("📁 [DELETE FILE] Starting DELETE request...");

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      console.log("📁 [DELETE FILE] User ID:", userId);

      const user = await storage.getUser(userId);
      console.log("📁 [DELETE FILE] User role:", user?.role);

      const isAdminUser = await deps.checkAdminAccess(user, req.user.tenantId);
      if (!isAdminUser) {
        console.log("📁 [DELETE FILE] ❌ Access denied - user is not admin");
        return res.status(403).json({ message: "Admin access required" });
      }

      const fileId = req.params.id;
      console.log("📁 [DELETE FILE] File ID to delete:", fileId);

      console.log("📁 [DELETE FILE] Fetching file metadata from database...");
      const file = await storage.getKnowledgeBaseFile(fileId, req.user.tenantId);
      if (!file) {
        console.log("📁 [DELETE FILE] ❌ File not found in database");
        return res.status(404).json({ message: "File not found" });
      }

      console.log("📁 [DELETE FILE] File found:", {
        filename: file.filename,
        openaiFileId: file.openaiFileId,
        uploadedBy: file.uploadedBy,
      });

      console.log("📁 [DELETE FILE] Fetching OpenAI settings...");
      const settings = await storage.getOpenaiSettings(req.user.tenantId);
      console.log("📁 [DELETE FILE] Settings retrieved:", {
        hasApiKey: !!settings?.apiKey,
        hasOpenaiFileId: !!file.openaiFileId,
      });

      if (settings?.apiKey && file.openaiFileId) {
        console.log("📁 [DELETE FILE] Deleting file from OpenAI...");
        const openai = new OpenAI({ apiKey: settings.apiKey });

        if (settings.vectorStoreId) {
          try {
            await (openai.vectorStores.files as any).del(settings.vectorStoreId, file.openaiFileId);
            console.log("📁 [DELETE FILE] Removed file from vector store");
          } catch (vectorStoreError: any) {
            console.log(
              "📁 [DELETE FILE] ⚠️ Could not remove from vector store (may already be removed):",
              vectorStoreError.message
            );
          }
        }

        try {
          await (openai.files as any).del(file.openaiFileId);
          console.log("📁 [DELETE FILE] File deleted from OpenAI successfully");
        } catch (openaiDeleteError: any) {
          console.error("📁 [DELETE FILE] ⚠️ Error deleting from OpenAI:", openaiDeleteError.message);
          console.error("📁 [DELETE FILE] Will continue with database deletion");
        }
      } else {
        console.log("📁 [DELETE FILE] Skipping OpenAI deletion (no API key or file ID)");
      }

      console.log("📁 [DELETE FILE] Deleting file from database...");
      await storage.deleteKnowledgeBaseFile(fileId, req.user.tenantId);
      console.log("📁 [DELETE FILE] ✅ File deleted successfully");
      res.json({ success: true });
    } catch (error: any) {
      console.error("📁 [DELETE FILE] ❌ ERROR:", error.message);
      console.error("📁 [DELETE FILE] Stack trace:", error.stack);
      console.error("📁 [DELETE FILE] Full error object:", error);
      res.status(500).json({ message: error.message || "Failed to delete file" });
    }
  });
}
