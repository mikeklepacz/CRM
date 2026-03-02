import type { Express } from "express";
import { storage } from "../../storage";
import type { SalesStatusesDeps } from "./statuses.types";

export function registerStatusesDeleteRoute(app: Express, deps: SalesStatusesDeps): void {
  app.delete("/api/statuses/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      await storage.deleteStatus(req.params.id);
      res.json({ message: "Status deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting status:", error);
      res.status(500).json({ message: error.message || "Failed to delete status" });
    }
  });
}
