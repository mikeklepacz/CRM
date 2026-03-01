import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TenantFormData } from "@/components/super-admin/super-admin.forms";

export function useSuperAdminTenantMutations(props: any) {
  const p = props;

  const createTenantMutation = useMutation({
    mutationFn: async (data: TenantFormData) => {
      return await apiRequest("POST", "/api/super-admin/tenants", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/metrics"] });
      p.setIsCreateDialogOpen(false);
      p.createForm.reset();
      p.toast({ title: "Success", description: "Tenant created successfully" });
    },
    onError: (error: any) => {
      p.toast({ title: "Error", description: error.message || "Failed to create tenant", variant: "destructive" });
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TenantFormData & { settings?: { allowedModules?: string[] } } }) => {
      return await apiRequest("PATCH", `/api/super-admin/tenants/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/metrics"] });
      p.setEditingTenant(null);
      p.editForm.reset();
      p.setEditingAllowedModules([]);
      p.toast({ title: "Success", description: "Tenant updated successfully" });
    },
    onError: (error: any) => {
      p.toast({ title: "Error", description: error.message || "Failed to update tenant", variant: "destructive" });
    },
  });

  return { createTenantMutation, updateTenantMutation };
}
