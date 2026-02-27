export type CallQueueAnalyticsDeps = {
  isAuthenticatedCustom: any;
  checkAdminAccess: (user: any, tenantId: string | undefined) => Promise<boolean>;
};
