import type { Express } from "express";
import { insertCategorySchema } from "@shared/schema";
import { storage } from "../../storage";
import type { SalesCategoriesDeps } from "./categories.types";

export function registerCategoriesCreateRoute(app: Express, deps: SalesCategoriesDeps): void {
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
}
