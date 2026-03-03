import type { RequestHandler } from "express";

export const requireSuperAdmin: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = req.user as any;
  if (!user?.isSuperAdmin) {
    return res.status(403).json({ message: "Forbidden: Super admin access required" });
  }
  return next();
};

export const requireOrgAdmin: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = req.user as any;
  const isOrgAdminReadRoute =
    req.method === "GET" &&
    (req.path === "/api/org-admin/settings" || req.path === "/api/org-admin/projects");

  if (user?.isSuperAdmin) {
    return next();
  }
  if (user?.roleInTenant === "org_admin" || user?.role === "admin") {
    return next();
  }
  // Agents need read access for shared tenant/project context used across the app.
  if (isOrgAdminReadRoute && user?.tenantId && user?.roleInTenant === "agent") {
    return next();
  }
  return res.status(403).json({ message: "Forbidden: Organization admin access required" });
};

export const requireAgent: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = req.user as any;
  if (user?.isSuperAdmin) {
    return next();
  }
  if (user?.tenantId && user?.roleInTenant) {
    return next();
  }
  if (user?.role === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Forbidden: No valid tenant context" });
};

export const canAccessAdminFeatures = (user: any): boolean => {
  if (!user) return false;
  return user.isSuperAdmin || user.roleInTenant === "org_admin" || user.role === "admin";
};

export const isSuperAdmin = (user: any): boolean => {
  return user?.isSuperAdmin === true;
};
