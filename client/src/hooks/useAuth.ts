// Auth hook - from javascript_log_in_with_replit blueprint
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

// Extended user type with tenant context from session
export type AuthUser = User & {
  allowedModules?: string[] | null;
  tenantId?: string;
  roleInTenant?: string;
  tenantName?: string | null;
};

export function useAuth() {
  const { data: user, isLoading } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
