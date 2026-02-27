export type AlignerCoreDeps = {
  getEffectiveTenantId: (req: any) => Promise<string>;
  isAdmin: any;
  isAuthenticatedCustom: any;
};
