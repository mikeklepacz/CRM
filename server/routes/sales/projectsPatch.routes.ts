import type { Express } from "express";
import { storage } from "../../storage";
import { getTenantId, getUserId } from "./projects.helpers";
import { updateProjectSchema } from "./projects.schemas";
import type { SalesProjectsDeps } from "./projects.types";

export function registerProjectsPatchRoute(app: Express, deps: SalesProjectsDeps): void {
  app.patch("/api/projects/:id", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      const tenantId = getTenantId(req);

      const projects = await storage.getProjects(userId, tenantId);
      const project = projects.find((item) => item.id === id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const validation = updateProjectSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const updated = await storage.updateProject(id, tenantId, validation.data);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: error.message || "Failed to update project" });
    }
  });
}
