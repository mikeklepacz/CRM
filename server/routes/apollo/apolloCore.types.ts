export interface ApolloCoreRouteDeps {
  isAdmin: any;
  isAuthenticatedCustom: any;
  getEffectiveTenantId: (req: any) => Promise<string | undefined>;
}
