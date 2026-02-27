import type { Express } from "express";
import { storage } from "../../storage";
import type { SalesCategoriesDeps } from "./categories.types";

export function registerCategoriesGetAllRoute(app: Express, deps: SalesCategoriesDeps): void {
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
}
