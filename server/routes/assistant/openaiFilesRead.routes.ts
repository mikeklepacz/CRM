import type { Express } from "express";
import { storage } from "../../storage";

type Deps = {
  isAuthenticated: any;
};

export function registerOpenaiFilesReadRoutes(app: Express, deps: Deps): void {
  app.get("/api/openai/files", deps.isAuthenticated, async (req: any, res) => {
    try {
      console.log("📁 [FILES] Starting GET request...");

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      console.log("📁 [FILES] User ID:", userId);

      console.log("📁 [FILES] Fetching all knowledge base files from database...");
      const files = await storage.getAllKnowledgeBaseFiles(req.user.tenantId);
      console.log("📁 [FILES] Files retrieved:", {
        count: files.length,
        fileIds: files.map((file) => file.id),
      });

      console.log("📁 [FILES] ✅ Sending files to client");
      res.json(files);
    } catch (error: any) {
      console.error("📁 [FILES] ❌ ERROR:", error.message);
      console.error("📁 [FILES] Stack trace:", error.stack);
      console.error("📁 [FILES] Full error object:", error);
      res.status(500).json({ message: error.message || "Failed to fetch files" });
    }
  });
}
