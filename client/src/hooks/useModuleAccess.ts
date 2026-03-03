import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface TenantSettings {
  companyName?: string;
  timezone?: string;
  enabledModules?: string[];
  allowedModules?: string[];
  primaryColor?: string;
  logoUrl?: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  settings: TenantSettings;
  createdAt: string;
}

interface TenantSettingsResponse {
  tenant: Tenant;
}

interface ModuleAccessResult {
  isModuleEnabled: (moduleId: string) => boolean;
  allowedModules: string[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

export const MODULE_NAV_MAPPING: Record<string, string> = {
  voice: "voice_kb",
  "call-manager": "voice_kb",
  "knowledge-base": "voice_kb",
  ehub: "ehub",
  clients: "crm",
  sales: "crm",
  assistant: "assistant",
  documents: "docs",
  docs: "docs",
  "map-search": "map_search",
  "label-designer": "label_designer",
  "product-mockup": "label_designer",
  "follow-up": "followup",
  "follow-up-center": "followup",
  qualification: "qualification",
};

export function useModuleAccess(): ModuleAccessResult {
  const { user, isLoading: authLoading } = useAuth();
  const sessionAllowedModules = user?.allowedModules;

  // Fallback to tenant settings only when allowed modules are not present in auth user context.
  const { data: settingsData, isLoading: settingsLoading, error } = useQuery<TenantSettingsResponse>({
    queryKey: ['/api/tenant/settings'],
    enabled: !!user?.tenantId && !user?.isSuperAdmin && (sessionAllowedModules === undefined || sessionAllowedModules === null),
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const allowedModules = user?.isSuperAdmin 
    ? undefined // Super admins have no restrictions
    : (sessionAllowedModules ?? settingsData?.tenant?.settings?.allowedModules);

  const isModuleEnabled = (moduleId: string): boolean => {
    if (!user?.tenantId) {
      return false;
    }

    // Super admins have access to everything
    if (user.isSuperAdmin) {
      return true;
    }

    // If allowedModules is null/undefined, all modules are allowed (no restrictions set)
    // If allowedModules is an explicit empty array [], no modules are allowed
    if (allowedModules === undefined || allowedModules === null) {
      return true;
    }

    return allowedModules.includes(moduleId);
  };

  return {
    isModuleEnabled,
    allowedModules,
    isLoading: authLoading || (!!user?.tenantId && !user?.isSuperAdmin && (sessionAllowedModules === undefined || sessionAllowedModules === null) && settingsLoading),
    error: error as Error | null,
  };
}

export function isNavItemEnabled(
  navKey: string,
  allowedModules: string[] | null | undefined,
  isLoading: boolean
): boolean {
  if (isLoading) return true;
  const moduleId = MODULE_NAV_MAPPING[navKey];
  if (!moduleId) return true;
  // If allowedModules is undefined/null, all modules are allowed (no restrictions set)
  // If allowedModules is an explicit empty array [], no modules are allowed
  if (allowedModules === undefined || allowedModules === null) return true;
  return allowedModules.includes(moduleId);
}
