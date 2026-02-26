import { storage } from "../../storage";

// Check if the qualification module is enabled for the tenant.
// Priority order: 1) Super admin bypass, 2) Tenant allowedModules, 3) Session enabledModules, 4) Default allow.
export async function checkQualificationModuleAccess(req: any, res: any): Promise<boolean> {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ message: "Unauthorized - no tenant context" });
      return false;
    }

    if (req.user?.isSuperAdmin) {
      return true;
    }

    const tenant = await storage.getTenantById(tenantId);
    if (!tenant) {
      res.status(404).json({ message: "Tenant not found" });
      return false;
    }

    const allowedModules = tenant.settings?.allowedModules;

    if (Array.isArray(allowedModules)) {
      if (!allowedModules.includes("qualification")) {
        res.status(403).json({ message: "Qualification module is not enabled for this tenant" });
        return false;
      }
      return true;
    }

    const sessionModules = req.user?.enabledModules;
    if (Array.isArray(sessionModules)) {
      if (!sessionModules.includes("qualification")) {
        res.status(403).json({ message: "Qualification module is not enabled for your session" });
        return false;
      }
      return true;
    }

    return true;
  } catch (error) {
    console.error("Error checking qualification module access:", error);
    res.status(500).json({ message: "Failed to verify module access" });
    return false;
  }
}
