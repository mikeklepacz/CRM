export interface AdminEmailAccountsRouteDeps {
  isAdmin: any;
  isAuthenticatedCustom: any;
  getEffectiveTenantId: (req: any) => Promise<string | null>;
}
