import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface TenantModulesResponse {
  allowedModules: string[] | null;
}

interface ModuleAccessResult {
  isModuleEnabled: (moduleId: string) => boolean;
  allowedModules: string[] | null | undefined;
  isLoading: boolean;
  error: Error | null;
}

export const MODULE_NAV_MAPPING: Record<string, string> = {
  voice: "call_manager",
  "call-manager": "call_manager",
  "knowledge-base": "call_manager",
  ehub: "ehub",
  clients: "clients",
  sales: "sales",
  assistant: "assistant",
  documents: "docs",
  docs: "docs",
  "map-search": "map_search",
  analytics: "analytics",
  "label-designer": "label_designer",
  "product-mockup": "label_designer",
  "follow-up": "follow_up",
  "follow-up-center": "follow_up",
  pipelines: "pipelines",
  qualification: "qualification",
  apollo: "apollo",
};

export function useModuleAccess(): ModuleAccessResult {
  const { user, isLoading: authLoading } = useAuth();

  const { data, isLoading: settingsLoading, error } = useQuery<TenantModulesResponse>({
    queryKey: ['/api/tenant/modules'],
    enabled: !!user?.tenantId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const allowedModules = data?.allowedModules;

  const isModuleEnabled = (moduleId: string): boolean => {
    if (!user?.tenantId) {
      return false;
    }

    if (allowedModules === undefined || allowedModules === null) {
      return true;
    }

    return allowedModules.includes(moduleId);
  };

  return {
    isModuleEnabled,
    allowedModules,
    isLoading: authLoading || (!!user?.tenantId && settingsLoading),
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
  if (allowedModules === undefined || allowedModules === null) return true;
  return allowedModules.includes(moduleId);
}
