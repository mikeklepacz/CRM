import type { Express } from "express";
import { insertProjectSchema } from "@shared/schema";
import { storage } from "../../storage";
import { getTenantId, getUserId } from "./projects.helpers";
import type { SalesProjectsDeps } from "./projects.types";

export function registerProjectsCreateRoute(app: Express, deps: SalesProjectsDeps): void {
  app.post("/api/projects", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const validation = insertProjectSchema.safeParse({
        ...req.body,
        userId: getUserId(req),
        tenantId: getTenantId(req),
      });
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const project = await storage.createProject(validation.data);
      res.json(project);
    } catch (error: any) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: error.message || "Failed to create project" });
    }
  });
}
