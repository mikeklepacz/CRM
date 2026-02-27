export type CallSessionsDeps = {
  isAuthenticatedCustom: any;
  checkAdminAccess: (user: any, tenantId: string | undefined) => Promise<boolean>;
};
