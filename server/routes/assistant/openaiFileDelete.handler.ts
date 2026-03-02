import OpenAI from "openai";
import { storage } from "../../storage";

export async function handleOpenaiFileDelete(req: any, res: any, deps: any): Promise<any> {
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
}
