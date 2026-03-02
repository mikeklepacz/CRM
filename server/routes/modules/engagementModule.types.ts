export type EngagementModuleDeps = {
  checkAdminAccess: any;
  clearUserCache: any;
  getEffectiveTenantId: (req: any) => Promise<string | undefined>;
  googleSheets: any;
  isAdmin: any;
  isAuthenticatedCustom: any;
  storage: any;
};
