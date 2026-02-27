import type { Express } from "express";
import { storage } from "../../storage";
import type { SalesExclusionsDeps } from "./exclusions.types";

export function registerExclusionsCreateRoute(app: Express, deps: SalesExclusionsDeps): void {
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
}
