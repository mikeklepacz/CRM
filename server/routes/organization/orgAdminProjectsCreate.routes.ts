import type { Express } from "express";
import type { OrgAdminProjectsRouteDeps } from "./orgAdminProjects.types";
import { storage } from "../../storage";

export function registerOrgAdminProjectsCreateRoute(app: Express, deps: OrgAdminProjectsRouteDeps): void {
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
      }
      catch (error: any) {
          console.error("Error creating project:", error);
          res.status(500).json({ message: error.message || "Failed to create project" });
      }
  });
}
