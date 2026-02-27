export type ApolloPrescreenDeps = {
  isAdmin: any;
  isAuthenticatedCustom: any;
  getEffectiveTenantId: (req: any) => Promise<string | undefined>;
};
