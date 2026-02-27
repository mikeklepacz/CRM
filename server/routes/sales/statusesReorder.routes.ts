import type { Express } from "express";
import { storage } from "../../storage";
import type { SalesStatusesDeps } from "./statuses.types";

export function registerStatusesReorderRoute(app: Express, deps: SalesStatusesDeps): void {
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
}
