import type { Express } from "express";
import { insertStatusSchema } from "@shared/schema";
import { storage } from "../../storage";
import { seedDefaultStatuses } from "../../services/sales/statusSeedService";

type Deps = {
  isAuthenticatedCustom: any;
  isAdmin: any;
};

export function registerSalesStatusesRoutes(app: Express, deps: Deps): void {
  app.get("/api/statuses", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const statuses = await storage.getAllStatuses(req.user.tenantId);
      res.json({ statuses });
    } catch (error: any) {
      console.error("Error fetching statuses:", error);
      res.status(500).json({ message: error.message || "Failed to fetch statuses" });
    }
  });

  app.get("/api/statuses/active", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const statuses = await storage.getActiveStatuses(req.user.tenantId);
      res.json({ statuses });
    } catch (error: any) {
      console.error("Error fetching active statuses:", error);
      res.status(500).json({ message: error.message || "Failed to fetch statuses" });
    }
  });

  app.post("/api/statuses", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const validation = insertStatusSchema.safeParse({ ...req.body, tenantId });
      if (!validation.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validation.error.errors,
        });
      }

      const status = await storage.createStatus(validation.data);
      res.json({ status });
    } catch (error: any) {
      console.error("Error creating status:", error);
      res.status(500).json({ message: error.message || "Failed to create status" });
    }
  });

  app.put("/api/statuses/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const validation = insertStatusSchema.safeParse({ ...req.body, tenantId });
      if (!validation.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validation.error.errors,
        });
      }

      const status = await storage.updateStatus(req.params.id, validation.data);
      res.json({ status });
    } catch (error: any) {
      console.error("Error updating status:", error);
      res.status(500).json({ message: error.message || "Failed to update status" });
    }
  });

  app.delete("/api/statuses/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      await storage.deleteStatus(req.params.id);
      res.json({ message: "Status deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting status:", error);
      res.status(500).json({ message: error.message || "Failed to delete status" });
    }
  });

  app.post("/api/statuses/reorder", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { updates } = req.body;
      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: "Updates must be an array" });
      }

      for (const update of updates) {
        if (!update.id || typeof update.displayOrder !== "number") {
          return res.status(400).json({ message: "Each update must have id and displayOrder" });
        }
      }

      await storage.reorderStatuses(updates);
      res.json({ message: "Statuses reordered successfully" });
    } catch (error: any) {
      console.error("Error reordering statuses:", error);
      res.status(500).json({ message: error.message || "Failed to reorder statuses" });
    }
  });

  app.post("/api/statuses/seed", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const existingStatuses = await storage.getAllStatuses(req.user.tenantId);
      if (existingStatuses.length > 0) {
        return res.status(400).json({ message: "Statuses already exist. Clear the database first if you want to re-seed." });
      }

      const createdStatuses = await seedDefaultStatuses();
      res.json({
        message: "Default statuses seeded successfully",
        statuses: createdStatuses,
      });
    } catch (error: any) {
      console.error("Error seeding statuses:", error);
      res.status(500).json({ message: error.message || "Failed to seed statuses" });
    }
  });
}
