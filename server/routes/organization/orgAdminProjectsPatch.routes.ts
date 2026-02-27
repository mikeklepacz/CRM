import type { Express } from "express";
import type { OrgAdminProjectsRouteDeps } from "./orgAdminProjects.types";
import { syncProjectNameToStoreSheetCategories } from "../../services/organization/projectCategorySyncService";
import { storage } from "../../storage";

export function registerOrgAdminProjectsPatchRoute(app: Express, deps: OrgAdminProjectsRouteDeps): void {
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
          if (name !== undefined)
              updates.name = name.trim();
          if (slug !== undefined)
              updates.slug = slug.trim();
          if (projectType !== undefined)
              updates.projectType = projectType;
          if (description !== undefined)
              updates.description = description?.trim();
          if (settings !== undefined)
              updates.settings = settings;
          if (status !== undefined)
              updates.status = status;
          if (accentColor !== undefined)
              updates.accentColor = accentColor;
          const project = await storage.updateTenantProject(projectId, tenantId, updates);
          if (name && name.trim() !== existing.name) {
              const oldName = existing.name;
              const newName = name.trim();
              try {
                  await syncProjectNameToStoreSheetCategories(tenantId, oldName, newName);
              }
              catch (syncError) {
                  console.error("Failed to sync category to Google Sheet:", syncError);
              }
          }
          res.json({ project });
      }
      catch (error: any) {
          console.error("Error updating project:", error);
          res.status(500).json({ message: error.message || "Failed to update project" });
      }
  });
}
