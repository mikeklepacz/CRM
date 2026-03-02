import type { Express } from "express";
import { storage } from "../../storage";
import { getTenantId, getUserId } from "./projects.helpers";
import type { SalesProjectsDeps } from "./projects.types";

export function registerProjectsListRoute(app: Express, deps: SalesProjectsDeps): void {
  app.get("/api/projects", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const projects = await storage.getProjects(getUserId(req), getTenantId(req));
      res.json(projects);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: error.message || "Failed to fetch projects" });
    }
  });
}
