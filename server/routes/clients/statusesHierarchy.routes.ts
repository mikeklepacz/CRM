import type { Express } from "express";
import { storage } from "../../storage";
import type { StoreLifecycleDeps } from "./storeLifecycle.types";

export function registerStatusesHierarchyRoute(app: Express, deps: StoreLifecycleDeps): void {
  app.get("/api/statuses/hierarchy", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const statuses = await storage.getAllStatuses(req.user.tenantId);
      const hierarchy: Record<string, number> = {};
      statuses.forEach((status) => {
        hierarchy[status.name] = status.displayOrder;
      });

      res.json(hierarchy);
    } catch (error: any) {
      console.error("[STATUS-HIERARCHY] Error:", error);
      res.status(500).json({ message: error.message || "Failed to fetch status hierarchy" });
    }
  });
}
