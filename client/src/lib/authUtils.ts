// Auth utility functions - from javascript_log_in_with_replit blueprint
export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function canAccessAdminFeatures(user: any): boolean {
  if (!user) return false;
  return user.isSuperAdmin || user.roleInTenant === 'org_admin' || user.role === 'admin';
}

export function isSuperAdmin(user: any): boolean {
  return user?.isSuperAdmin === true;
}
