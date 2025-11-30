import { useQuery } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";

// Mock useAuth and useOptionalProject for demonstration purposes if not provided elsewhere
// In a real scenario, these would be imported from your authentication and context modules.
const useAuth = () => ({
  user: {
    tenantId: "test-tenant-id", // Example tenant ID
    isSuperAdmin: false,
    enabledModules: ["ehub", "crm"] // Example enabled modules
  }
});

const useOptionalProject = () => null; // Example return value

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
  analytics: "analytics",
  "label-designer": "label_designer",
  "product-mockup": "label_designer",
  "follow-up": "followup",
  "follow-up-center": "followup",
  pipelines: "pipelines",
};

export function useModuleAccess(): ModuleAccessResult {
  const { user } = useAuth();
  const projectContext = useOptionalProject();

  const isModuleEnabled = (moduleId: string): boolean => {
    if (!user?.tenantId) {
      console.log('[ModuleAccess] No tenantId found for user');
      return false;
    }

    // Super admins have access to everything
    if (user.isSuperAdmin) {
      console.log('[ModuleAccess] Super admin - granting access to', moduleId);
      return true;
    }

    // Get tenant's enabled modules from session
    const tenantModules = (user as any).enabledModules || [];
    console.log('[ModuleAccess] Checking module access:', {
      moduleId,
      tenantId: user.tenantId,
      enabledModules: tenantModules,
      hasAccess: tenantModules.includes(moduleId)
    });

    return tenantModules.includes(moduleId);
  };

  return {
    isModuleEnabled,
    isLoading: !user,
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