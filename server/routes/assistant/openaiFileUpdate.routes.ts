import type { Express } from "express";
import { storage } from "../../storage";
import type { OpenaiFilesMutationsDeps } from "./openaiFilesMutations.types";

export function registerOpenaiFileUpdateRoute(app: Express, deps: OpenaiFilesMutationsDeps): void {
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
}
