import type { Express } from "express";
import { z } from "zod";
import { insertProjectSchema } from "@shared/schema";
import { storage } from "../../storage";

type Deps = {
  isAuthenticatedCustom: any;
};

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

function getUserId(req: any): string {
  return req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
}

function getTenantId(req: any): string {
  return req.user.tenantId;
}

export function registerSalesProjectsRoutes(app: Express, deps: Deps): void {
  app.get("/api/projects", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const projects = await storage.getProjects(getUserId(req), getTenantId(req));
      res.json(projects);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: error.message || "Failed to fetch projects" });
    }
  });

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
