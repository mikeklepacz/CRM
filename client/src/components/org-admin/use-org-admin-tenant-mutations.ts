import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useOrgAdminTenantMutations(props: any) {
  const p = props;

  const switchTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      return apiRequest("POST", "/api/super-admin/switch-tenant", { tenantId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ predicate: (query) =>
        Array.isArray(query.queryKey) && query.queryKey[0] === "/api/tenant/projects"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/invites"] });
      queryClient.invalidateQueries({ predicate: (query) =>
        Array.isArray(query.queryKey) && query.queryKey[0] === "/api/org-admin/pipelines"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/projects"] });
      queryClient.invalidateQueries({ predicate: (query) =>
        Array.isArray(query.queryKey) && query.queryKey[0] === "/api/elevenlabs/agents"
      });
      p.toast({ title: "Switched organization", description: "Now viewing as selected organization" });
    },
    onError: (error: Error) => {
      p.toast({ title: "Error switching organization", description: error.message, variant: "destructive" });
    },
  });

  const clearTenantOverrideMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("GET", "/api/super-admin/switch-tenant/clear");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ predicate: (query) =>
        Array.isArray(query.queryKey) && query.queryKey[0] === "/api/tenant/projects"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/invites"] });
      queryClient.invalidateQueries({ predicate: (query) =>
        Array.isArray(query.queryKey) && query.queryKey[0] === "/api/org-admin/pipelines"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/projects"] });
      queryClient.invalidateQueries({ predicate: (query) =>
        Array.isArray(query.queryKey) && query.queryKey[0] === "/api/elevenlabs/agents"
      });
      p.toast({ title: "Cleared override", description: "Returned to your default organization" });
    },
    onError: (error: Error) => {
      p.toast({ title: "Error clearing override", description: error.message, variant: "destructive" });
    },
  });

  return {
    clearTenantOverrideMutation,
    switchTenantMutation,
  };
}
