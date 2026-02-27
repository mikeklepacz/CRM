export type AlignerFilesDeps = {
  getEffectiveTenantId: (req: any) => Promise<string>;
  isAdmin: any;
  isAuthenticatedCustom: any;
};
