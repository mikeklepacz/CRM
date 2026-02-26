import type { Express } from "express";
import { storage } from "../../storage";

type Deps = {
  isAuthenticatedCustom: any;
};

export function registerMapSearchPreferenceRoutes(app: Express, deps: Deps): void {
  // Update user's active exclusions
  app.put("/api/user/active-exclusions", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { activeKeywords = [], activeTypes = [] } = req.body;
      const preferences = await storage.updateUserActiveExclusions(
        userId,
        req.user.tenantId,
        activeKeywords,
        activeTypes
      );
      res.json({ preferences });
    } catch (error: any) {
      console.error("Error updating active exclusions:", error);
      res.status(500).json({ message: error.message || "Failed to update active exclusions" });
    }
  });

  // Get all search history (global, newest first)
  app.get("/api/maps/search-history", deps.isAuthenticatedCustom, async (_req: any, res) => {
    try {
      const history = await storage.getAllSearchHistory();
      res.json({ history });
    } catch (error: any) {
      console.error("Error fetching search history:", error);
      res.status(500).json({ message: error.message || "Failed to fetch search history" });
    }
  });

  // Delete search history entry
  app.delete("/api/maps/search-history/:id", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSearchHistory(id);
      res.json({ message: "Search history entry deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting search history:", error);
      res.status(500).json({ message: error.message || "Failed to delete search history" });
    }
  });

  // Get last selected category for Map Search
  app.get("/api/maps/last-category", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const lastCategory = await storage.getLastCategory(userId, tenantId);
      res.json({ category: lastCategory || "Pets" });
    } catch (error: any) {
      console.error("Error fetching last category:", error);
      res.status(500).json({ message: error.message || "Failed to fetch last category" });
    }
  });

  // Set last selected category for Map Search
  app.post("/api/maps/last-category", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const { category } = req.body;

      if (!category) {
        return res.status(400).json({ message: "Category is required" });
      }

      await storage.setLastCategory(userId, tenantId, category);
      res.json({ message: "Last category saved successfully", category });
    } catch (error: any) {
      console.error("Error saving last category:", error);
      res.status(500).json({ message: error.message || "Failed to save last category" });
    }
  });

  // Get selected category for CRM filtering
  app.get("/api/user/selected-category", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const selectedCategory = await storage.getSelectedCategory(userId, tenantId);
      res.json({ category: selectedCategory });
    } catch (error: any) {
      console.error("Error fetching selected category:", error);
      res.status(500).json({ message: error.message || "Failed to fetch selected category" });
    }
  });

  // Set selected category for CRM filtering
  app.post("/api/user/selected-category", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const { category } = req.body;

      if (!category) {
        return res.status(400).json({ message: "Category is required" });
      }

      await storage.setSelectedCategory(userId, tenantId, category);
      res.json({ message: "Selected category saved successfully", category });
    } catch (error: any) {
      console.error("Error saving selected category:", error);
      res.status(500).json({ message: error.message || "Failed to save selected category" });
    }
  });
}
