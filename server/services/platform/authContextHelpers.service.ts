type Deps = {
  client: {
    refreshTokenGrant: (config: any, refreshToken: string) => Promise<any>;
  };
  getOidcConfig: () => Promise<any>;
  storage: any;
};

export function createAuthContextHelpers(deps: Deps) {
  const { client, getOidcConfig, storage } = deps;

  const isAuthenticatedCustom = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    const user = req.user as any;
    if (user.isPasswordAuth) return next();
    if (!user || !user.expires_at) return res.status(401).json({ message: "Unauthorized" });

    const now = Math.floor(Date.now() / 1000);
    if (now <= user.expires_at) return next();

    const refreshToken = user.refresh_token;
    if (!refreshToken) return res.status(401).json({ message: "Unauthorized" });

    try {
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      user.claims = tokenResponse.claims();
      user.access_token = tokenResponse.access_token;
      user.refresh_token = tokenResponse.refresh_token;
      user.expires_at = user.claims?.exp;
      return next();
    } catch (error) {
      console.error("Replit Auth refresh failed:", error);
      return res.status(401).json({ message: "Unauthorized" });
    }
  };

  const isAdmin = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(403).json({ message: "Admin access required" });

      if (user.isSuperAdmin || user.role === "admin") {
        req.currentUser = user;
        return next();
      }

      const tenantId = req.user.tenantId;
      if (tenantId) {
        const roleInTenant = await storage.getUserTenantRole(userId, tenantId);
        if (roleInTenant === "org_admin") {
          req.currentUser = { ...user, roleInTenant };
          return next();
        }
      }

      return res.status(403).json({ message: "Admin access required" });
    } catch (error: any) {
      console.error("Admin middleware error:", error);
      res.status(500).json({ message: error.message || "Authorization check failed" });
    }
  };

  const getCurrentUser = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      req.currentUser = user;
      next();
    } catch (error: any) {
      console.error("getCurrentUser middleware error:", error);
      res.status(500).json({ message: error.message || "User fetch failed" });
    }
  };

  const checkAdminAccess = async (user: any, tenantId: string | undefined): Promise<boolean> => {
    if (!user) return false;
    if (user.isSuperAdmin || user.role === "admin") return true;
    if (!tenantId) return false;
    const roleInTenant = await storage.getUserTenantRole(user.id, tenantId);
    return roleInTenant === "org_admin";
  };

  const getEffectiveTenantId = async (req: any): Promise<string | undefined> => {
    const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
    const user = await storage.getUser(userId);
    if (user?.isSuperAdmin && req.session?.tenantOverrideId) {
      return req.session.tenantOverrideId;
    }
    return req.user.tenantId;
  };

  return {
    checkAdminAccess,
    getCurrentUser,
    getEffectiveTenantId,
    isAdmin,
    isAuthenticatedCustom,
  };
}
