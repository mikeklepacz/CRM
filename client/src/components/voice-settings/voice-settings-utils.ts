export function getVoiceSettingsApiBase(tenantId?: string) {
  const isSuperAdminMode = !!tenantId;
  const apiBase = isSuperAdminMode
    ? `/api/super-admin/tenants/${tenantId}/elevenlabs`
    : "/api/elevenlabs";

  return { isSuperAdminMode, apiBase };
}
