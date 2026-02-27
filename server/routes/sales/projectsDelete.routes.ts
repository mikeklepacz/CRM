import type { Express } from "express";
import { storage } from "../../storage";
import { getTenantId, getUserId } from "./projects.helpers";
import type { SalesProjectsDeps } from "./projects.types";

export function registerProjectsDeleteRoute(app: Express, deps: SalesProjectsDeps): void {
  app.delete("/api/projects/:id", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      const tenantId = getTenantId(req);

      const projects = await storage.getProjects(userId, tenantId);
      const project = projects.find((item) => item.id === id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      await storage.deleteProject(id, tenantId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: error.message || "Failed to delete project" });
    }
  });
}
