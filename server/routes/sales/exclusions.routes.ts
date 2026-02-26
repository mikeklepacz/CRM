import type { Express } from "express";
import { storage } from "../../storage";

type Deps = {
  isAuthenticatedCustom: any;
};

export function registerSalesExclusionsRoutes(app: Express, deps: Deps): void {
  app.get("/api/exclusions", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const exclusions = await storage.getAllSavedExclusions(req.user.tenantId, projectId);
      res.json({ exclusions });
    } catch (error: any) {
      console.error("Error fetching exclusions:", error);
      res.status(500).json({ message: error.message || "Failed to fetch exclusions" });
    }
  });

  app.get("/api/exclusions/:type", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { type } = req.params;
      if (type !== "keyword" && type !== "place_type") {
        return res.status(400).json({ message: 'Invalid type. Must be "keyword" or "place_type"' });
      }

      const projectId = req.query.projectId as string | undefined;
      const exclusions = await storage.getSavedExclusionsByType(req.user.tenantId, projectId, type);
      res.json({ exclusions });
    } catch (error: any) {
      console.error("Error fetching exclusions by type:", error);
      res.status(500).json({ message: error.message || "Failed to fetch exclusions" });
    }
  });

  app.post("/api/exclusions", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { type, value, projectId } = req.body;
      if (!type || !value) {
        return res.status(400).json({ message: "Type and value are required" });
      }
      if (type !== "keyword" && type !== "place_type") {
        return res.status(400).json({ message: 'Invalid type. Must be "keyword" or "place_type"' });
      }

      const exclusion = await storage.createSavedExclusion({
        tenantId: req.user.tenantId,
        projectId,
        type,
        value: value.toLowerCase().trim(),
      });
      res.json({ exclusion });
    } catch (error: any) {
      console.error("Error creating exclusion:", error);
      res.status(500).json({ message: error.message || "Failed to create exclusion" });
    }
  });

  app.delete("/api/exclusions/:id", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      await storage.deleteSavedExclusion(req.params.id);
      res.json({ message: "Exclusion deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting exclusion:", error);
      res.status(500).json({ message: error.message || "Failed to delete exclusion" });
    }
  });
}
