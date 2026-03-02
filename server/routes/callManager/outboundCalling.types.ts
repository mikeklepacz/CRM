export type OutboundCallingDeps = {
  isAdmin: any;
  isAuthenticatedCustom: any;
  checkAdminAccess: (user: any, tenantId: string | undefined) => Promise<boolean>;
};
