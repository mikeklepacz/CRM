export function getUserId(req: any): string {
  return req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
}

export function ensureSelfOrAdmin(user: any, subjectId: string, errorMessage: string): string | null {
  if (user.role !== "admin" && subjectId !== user.id) {
    return errorMessage;
  }
  return null;
}
