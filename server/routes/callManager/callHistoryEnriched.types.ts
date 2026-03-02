export type CallHistoryEnrichedDeps = {
  isAuthenticatedCustom: any;
  checkAdminAccess: (user: any, tenantId: string | undefined) => Promise<boolean>;
};
