import type { Express } from "express";
import { storage } from "../../storage";
import type { SalesCategoriesDeps } from "./categories.types";

export function registerCategoriesDeleteRoute(app: Express, deps: SalesCategoriesDeps): void {
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
