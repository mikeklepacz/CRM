type Deps = {
  cleanupDeletedCalendarEvents: (userId: string, tenantId: string | undefined) => Promise<any>;
  renewCalendarWatchIfNeeded: (userId: string) => Promise<any>;
  storage: any;
  syncRemindersToCalendar: (userId: string, tenantId: string | undefined) => Promise<any>;
};

export function createAuthUserHandler(deps: Deps) {
  const { cleanupDeletedCalendarEvents, renewCalendarWatchIfNeeded, storage, syncRemindersToCalendar } = deps;

  return async (req: any, res: any) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);

      setImmediate(async () => {
        try {
          await syncRemindersToCalendar(userId, req.user.tenantId);
          await cleanupDeletedCalendarEvents(userId, req.user.tenantId);
          await renewCalendarWatchIfNeeded(userId);
        } catch (error: any) {
          console.error("[LoginSync] Background sync failed:", error.message);
        }
      });

      let effectiveTenantId = req.user.tenantId;
      let effectiveRoleInTenant = req.user.roleInTenant;
      let tenantName: string | null = null;
      let isViewingAsTenant = false;

      if (user?.isSuperAdmin && req.session?.tenantOverrideId) {
        effectiveTenantId = req.session.tenantOverrideId;
        isViewingAsTenant = true;
        effectiveRoleInTenant = (await storage.getUserTenantRole(userId, effectiveTenantId)) || "org_admin";
      }

      let allowedModules: string[] | null = null;
      if (effectiveTenantId) {
        const tenant = await storage.getTenantById(effectiveTenantId);
        tenantName = tenant?.name || null;
        allowedModules = tenant?.settings?.allowedModules || null;
      }

      console.log("[Auth User] Returning user data, twilioPhoneNumber:", user?.twilioPhoneNumber || "NOT SET");
      res.json({
        ...user,
        tenantId: effectiveTenantId,
        roleInTenant: effectiveRoleInTenant,
        tenantName,
        isViewingAsTenant,
        allowedModules,
      });
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: error.message || "Failed to fetch user" });
    }
  };
}
