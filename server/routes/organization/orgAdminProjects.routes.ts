import type { Express } from "express";
import { syncProjectNameToStoreSheetCategories } from "../../services/organization/projectCategorySyncService";
import { storage } from "../../storage";

export function registerOrgAdminProjectsRoutes(
  app: Express,
  deps: { requireOrgAdmin: any }
): void {
  app.get("/api/org-admin/projects", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { status } = req.query;
      const projects = await storage.listTenantProjects(tenantId, status as string | undefined);
      res.json({ projects });
    } catch (error: any) {
      console.error("Error listing projects:", error);
      res.status(500).json({ message: error.message || "Failed to list projects" });
    }
  });

  app.get("/api/org-admin/projects/:projectId", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const tenantId = req.user.tenantId;
      const project = await storage.getTenantProjectById(projectId, tenantId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json({ project });
    } catch (error: any) {
      console.error("Error getting project:", error);
      res.status(500).json({ message: error.message || "Failed to get project" });
    }
  });

  app.post("/api/org-admin/projects", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { name, slug, projectType, description, settings, isDefault, accentColor } = req.body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ message: "Project name is required" });
      }

      if (slug) {
        const existing = await storage.getTenantProjectBySlug(slug, tenantId);
        if (existing) {
          return res.status(400).json({ message: "A project with this slug already exists" });
        }
      }

      const project = await storage.createTenantProject({
        tenantId,
        name: name.trim(),
        slug: slug?.trim(),
        projectType: projectType || "campaign",
        description: description?.trim(),
        settings: settings || {},
        isDefault: isDefault || false,
        accentColor: accentColor || "#6366f1",
        createdBy: userId,
      });

      if (isDefault) {
        await storage.setDefaultTenantProject(project.id, tenantId);
      }

      res.status(201).json({ project });
    } catch (error: any) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: error.message || "Failed to create project" });
    }
  });

  app.patch("/api/org-admin/projects/:projectId", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const tenantId = req.user.tenantId;
      const { name, slug, projectType, description, settings, status, accentColor } = req.body;

      const existing = await storage.getTenantProjectById(projectId, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (slug && slug !== existing.slug) {
        const slugExists = await storage.getTenantProjectBySlug(slug, tenantId);
        if (slugExists && slugExists.id !== projectId) {
          return res.status(400).json({ message: "A project with this slug already exists" });
        }
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name.trim();
      if (slug !== undefined) updates.slug = slug.trim();
      if (projectType !== undefined) updates.projectType = projectType;
      if (description !== undefined) updates.description = description?.trim();
      if (settings !== undefined) updates.settings = settings;
      if (status !== undefined) updates.status = status;
      if (accentColor !== undefined) updates.accentColor = accentColor;

      const project = await storage.updateTenantProject(projectId, tenantId, updates);

      if (name && name.trim() !== existing.name) {
        const oldName = existing.name;
        const newName = name.trim();
        try {
          await syncProjectNameToStoreSheetCategories(tenantId, oldName, newName);
        } catch (syncError) {
          console.error("Failed to sync category to Google Sheet:", syncError);
        }
      }

      res.json({ project });
    } catch (error: any) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: error.message || "Failed to update project" });
    }
  });

  app.post("/api/org-admin/projects/:projectId/archive", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;

      const existing = await storage.getTenantProjectById(projectId, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (existing.status === "archived") {
        return res.status(400).json({ message: "Project is already archived" });
      }

      const project = await storage.archiveTenantProject(projectId, tenantId, userId);
      res.json({ project });
    } catch (error: any) {
      console.error("Error archiving project:", error);
      res.status(500).json({ message: error.message || "Failed to archive project" });
    }
  });

  app.post("/api/org-admin/projects/:projectId/restore", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const tenantId = req.user.tenantId;

      const existing = await storage.getTenantProjectById(projectId, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (existing.status !== "archived") {
        return res.status(400).json({ message: "Project is not archived" });
      }

      const project = await storage.restoreTenantProject(projectId, tenantId);
      res.json({ project });
    } catch (error: any) {
      console.error("Error restoring project:", error);
      res.status(500).json({ message: error.message || "Failed to restore project" });
    }
  });

  app.post("/api/org-admin/projects/:projectId/set-default", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const tenantId = req.user.tenantId;

      const existing = await storage.getTenantProjectById(projectId, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (existing.status === "archived") {
        return res.status(400).json({ message: "Cannot set archived project as default" });
      }

      const project = await storage.setDefaultTenantProject(projectId, tenantId);
      res.json({ project });
    } catch (error: any) {
      console.error("Error setting default project:", error);
      res.status(500).json({ message: error.message || "Failed to set default project" });
    }
  });

  app.delete("/api/org-admin/projects/:projectId", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const tenantId = req.user.tenantId;

      const existing = await storage.getTenantProjectById(projectId, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (existing.isDefault) {
        return res
          .status(400)
          .json({ message: "Cannot delete the default project. Set another project as default first." });
      }

      await storage.deleteTenantProject(projectId, tenantId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: error.message || "Failed to delete project" });
    }
  });

  app.get("/api/org-admin/projects/:projectId/config", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const tenantId = req.user.tenantId;

      const { resolveProjectConfig } = await import("../../services/projectConfigResolver");
      const config = await resolveProjectConfig(tenantId, projectId);

      if (!config) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json({ config });
    } catch (error: any) {
      console.error("Error getting project config:", error);
      res.status(500).json({ message: error.message || "Failed to get project config" });
    }
  });
}
