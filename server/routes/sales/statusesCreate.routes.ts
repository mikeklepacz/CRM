import type { Express } from "express";
import { insertStatusSchema } from "@shared/schema";
import { storage } from "../../storage";
import type { SalesStatusesDeps } from "./statuses.types";

export function registerStatusesCreateRoute(app: Express, deps: SalesStatusesDeps): void {
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
}
