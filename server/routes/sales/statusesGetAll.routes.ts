import type { Express } from "express";
import { storage } from "../../storage";
import type { SalesStatusesDeps } from "./statuses.types";

export function registerStatusesGetAllRoute(app: Express, deps: SalesStatusesDeps): void {
  app.get("/api/statuses", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const statuses = await storage.getAllStatuses(req.user.tenantId);
      res.json({ statuses });
    } catch (error: any) {
      console.error("Error fetching statuses:", error);
      res.status(500).json({ message: error.message || "Failed to fetch statuses" });
    }
  });
}
