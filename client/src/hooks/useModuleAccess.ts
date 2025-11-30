import { useQuery } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";

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
  enabledModules: string[];
  allowedModules: string[];
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
  analytics: "analytics",
  "label-designer": "label_designer",
  "product-mockup": "label_designer",
  "follow-up": "followup",
  "follow-up-center": "followup",
  pipelines: "pipelines",
};

export function useModuleAccess(): ModuleAccessResult {
  const { data, isLoading, error } = useQuery<TenantSettingsResponse>({
    queryKey: ["/api/org-admin/settings"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const enabledModules = useMemo(() => {
    return data?.tenant?.settings?.enabledModules || [];
  }, [data?.tenant?.settings?.enabledModules]);

  const allowedModules = useMemo(() => {
    return data?.tenant?.settings?.allowedModules || [];
  }, [data?.tenant?.settings?.allowedModules]);

  const isModuleEnabled = useCallback(
    (moduleId: string): boolean => {
      if (isLoading) return true;
      if (!data?.tenant?.settings?.enabledModules) return true;
      return enabledModules.includes(moduleId);
    },
    [isLoading, data?.tenant?.settings?.enabledModules, enabledModules]
  );

  return {
    isModuleEnabled,
    enabledModules,
    allowedModules,
    isLoading,
    error: error as Error | null,
  };
}

export function isNavItemEnabled(
  navKey: string,
  enabledModules: string[],
  isLoading: boolean
): boolean {
  if (isLoading) return true;
  const moduleId = MODULE_NAV_MAPPING[navKey];
  if (!moduleId) return true;
  if (enabledModules.length === 0) return true;
  return enabledModules.includes(moduleId);
}
