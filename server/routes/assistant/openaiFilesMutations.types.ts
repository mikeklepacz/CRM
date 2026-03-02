export type OpenaiFilesMutationsDeps = {
  checkAdminAccess: (user: any, tenantId: string | undefined) => Promise<boolean>;
  isAuthenticated: any;
};
