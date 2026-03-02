export type ApolloManagementDeps = {
  getEffectiveTenantId: (req: any) => Promise<string | undefined>;
  isAdmin: any;
  isAuthenticatedCustom: any;
};
