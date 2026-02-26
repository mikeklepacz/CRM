import type { Express } from "express";
import { insertCategorySchema } from "@shared/schema";
import { storage } from "../../storage";

type Deps = {
  isAuthenticatedCustom: any;
  isAdmin: any;
};

export function registerSalesCategoriesRoutes(app: Express, deps: Deps): void {
  app.get("/api/categories", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const categories = await storage.getAllCategories(req.user.tenantId, projectId);
      res.json({ categories });
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: error.message || "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/active", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const categories = await storage.getActiveCategories(req.user.tenantId, projectId);
      res.json({ categories });
    } catch (error: any) {
      console.error("Error fetching active categories:", error);
      res.status(500).json({ message: error.message || "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const validation = insertCategorySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const category = await storage.createCategory(validation.data);
      res.json({ category });
    } catch (error: any) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: error.message || "Failed to create category" });
    }
  });

  app.put("/api/categories/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const validation = insertCategorySchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const category = await storage.updateCategory(req.params.id, validation.data);
      res.json({ category });
    } catch (error: any) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: error.message || "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.json({ message: "Category deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: error.message || "Failed to delete category" });
    }
  });
}
