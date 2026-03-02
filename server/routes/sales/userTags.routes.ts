import type { Express } from "express";
import { storage } from "../../storage";

type Deps = {
  isAuthenticatedCustom: any;
};

function getUserId(req: any): string {
  return req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
}

export function registerSalesUserTagsRoutes(app: Express, deps: Deps): void {
  app.get("/api/user-tags", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const tags = await storage.getUserTags(getUserId(req));
      res.json(tags);
    } catch (error: any) {
      console.error("Error fetching user tags:", error);
      res.status(500).json({ message: error.message || "Failed to fetch user tags" });
    }
  });

  app.post("/api/user-tags", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { tag } = req.body;
      if (!tag || typeof tag !== "string" || !tag.trim()) {
        return res.status(400).json({ message: "Tag is required" });
      }

      const newTag = await storage.addUserTag(getUserId(req), tag, req.user.tenantId);
      res.json(newTag);
    } catch (error: any) {
      console.error("Error adding user tag:", error);
      res.status(500).json({ message: error.message || "Failed to add user tag" });
    }
  });

  app.delete("/api/user-tags/:tag", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      await storage.removeUserTag(getUserId(req), decodeURIComponent(req.params.tag));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting user tag:", error);
      res.status(500).json({ message: error.message || "Failed to delete user tag" });
    }
  });

  app.delete("/api/user-tags/by-id/:id", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      await storage.removeUserTagById(getUserId(req), req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting user tag by ID:", error);
      res.status(500).json({ message: error.message || "Failed to delete user tag" });
    }
  });
}
