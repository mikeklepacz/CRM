import type { Express } from "express";
import { storage } from "../../storage";
import { seedDefaultStatuses } from "../../services/sales/statusSeedService";
import type { SalesStatusesDeps } from "./statuses.types";

export function registerStatusesSeedRoute(app: Express, deps: SalesStatusesDeps): void {
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
