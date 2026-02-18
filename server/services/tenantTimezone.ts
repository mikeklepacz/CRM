import { storage } from "../storage";

const UTC_TIMEZONE = "UTC";

function isValidTimezone(value: string | null | undefined): value is string {
  if (!value) return false;

  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function getRuntimeTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimezone(tz) ? tz : null;
  } catch {
    return null;
  }
}

/**
 * Resolve timezone for tenant-level scheduling.
 * Priority:
 * 1) Admin user's tenant-specific timezone preference
 * 2) Server runtime timezone
 * 3) UTC
 */
export async function resolveTenantTimezone(
  tenantId: string,
  options?: { adminUserId?: string }
): Promise<string> {
  const userIds: string[] = [];

  if (options?.adminUserId) {
    userIds.push(options.adminUserId);
  }

  const adminUser = await storage.getAdminUser();
  if (adminUser?.id && !userIds.includes(adminUser.id)) {
    userIds.push(adminUser.id);
  }

  for (const userId of userIds) {
    const prefs = await storage.getUserPreferences(userId, tenantId);
    if (isValidTimezone(prefs?.timezone)) {
      return prefs.timezone;
    }
  }

  const runtimeTz = getRuntimeTimezone();
  return runtimeTz || UTC_TIMEZONE;
}

