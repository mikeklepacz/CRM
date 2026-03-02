export type GmailPushDeps = {
  isAuthenticatedCustom: any;
  checkAdminAccess: (user: any, tenantId: string | undefined) => Promise<boolean>;
};
