export type OpenaiSettingsDeps = {
  checkAdminAccess: (user: any, tenantId: string | undefined) => Promise<boolean>;
  isAuthenticated: any;
};
