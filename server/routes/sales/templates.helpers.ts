export function getUserId(req: any): string {
  return req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
}

export function getTenantId(req: any): string {
  return req.user.tenantId;
}
