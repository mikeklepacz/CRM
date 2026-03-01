import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CreateUserFormData, EditUserFormData } from "@/components/super-admin/super-admin.forms";

export function useSuperAdminUserMutations(props: any) {
  const p = props;

  const addUserToTenantMutation = useMutation({
    mutationFn: async ({ userId, tenantId, roleInTenant }: { userId: string; tenantId: string; roleInTenant: string }) => {
      return await apiRequest("POST", `/api/super-admin/users/${userId}/tenants`, { tenantId, roleInTenant });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenants"] });
      p.setIsAddToTenantOpen(false);
      p.addUserToTenantForm.reset();
      if (p.selectedUser) {
        const tenant = p.tenantsData?.tenants?.find((t: any) => t.id === variables.tenantId);
        if (tenant) {
          p.setSelectedUser({
            ...p.selectedUser,
            tenantMemberships: [
              ...p.selectedUser.tenantMemberships,
              { tenantId: variables.tenantId, tenantName: tenant.name, roleInTenant: variables.roleInTenant },
            ],
          });
        }
      }
      p.toast({ title: "Success", description: "User added to tenant successfully" });
    },
    onError: (error: any) => {
      p.toast({ title: "Error", description: error.message || "Failed to add user to tenant", variant: "destructive" });
    },
  });

  const removeUserFromTenantMutation = useMutation({
    mutationFn: async ({ userId, tenantId }: { userId: string; tenantId: string }) => {
      return await apiRequest("DELETE", `/api/super-admin/users/${userId}/tenants/${tenantId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenants"] });
      if (p.selectedUser) {
        p.setSelectedUser({
          ...p.selectedUser,
          tenantMemberships: p.selectedUser.tenantMemberships.filter((m: any) => m.tenantId !== variables.tenantId),
        });
      }
      p.toast({ title: "Success", description: "User removed from tenant" });
    },
    onError: (error: any) => {
      p.toast({ title: "Error", description: error.message || "Failed to remove user from tenant", variant: "destructive" });
    },
  });

  const updateUserRoleInTenantMutation = useMutation({
    mutationFn: async ({ userId, tenantId, roleInTenant }: { userId: string; tenantId: string; roleInTenant: string }) => {
      return await apiRequest("PATCH", `/api/super-admin/users/${userId}/tenants/${tenantId}`, { roleInTenant });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenants"] });
      if (p.selectedUser) {
        p.setSelectedUser({
          ...p.selectedUser,
          tenantMemberships: p.selectedUser.tenantMemberships.map((m: any) =>
            m.tenantId === variables.tenantId ? { ...m, roleInTenant: variables.roleInTenant } : m
          ),
        });
      }
      p.toast({ title: "Success", description: "User role updated successfully" });
    },
    onError: (error: any) => {
      p.toast({ title: "Error", description: error.message || "Failed to update user role", variant: "destructive" });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      return await apiRequest("POST", "/api/super-admin/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/metrics"] });
      p.setIsCreateUserDialogOpen(false);
      p.createUserForm.reset();
      p.toast({ title: "Success", description: "User created successfully" });
    },
    onError: (error: any) => {
      p.toast({ title: "Error", description: error.message || "Failed to create user", variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: EditUserFormData }) => {
      return await apiRequest("PATCH", `/api/super-admin/users/${userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      p.setIsEditingUser(false);
      p.toast({ title: "Success", description: "User updated successfully" });
    },
    onError: (error: any) => {
      p.toast({ title: "Error", description: error.message || "Failed to update user", variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      return await apiRequest("PATCH", `/api/super-admin/users/${userId}/reset-password`, { newPassword });
    },
    onSuccess: () => {
      p.setIsResettingPassword(false);
      p.setNewPassword("");
      p.setConfirmPassword("");
      p.toast({ title: "Success", description: "Password reset successfully" });
    },
    onError: (error: any) => {
      p.toast({ title: "Error", description: error.message || "Failed to reset password", variant: "destructive" });
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/super-admin/users/${userId}/deactivate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/metrics"] });
      if (p.selectedUser) {
        p.setSelectedUser({ ...p.selectedUser, isActive: false });
      }
      p.toast({ title: "Success", description: "User deactivated successfully" });
    },
    onError: (error: any) => {
      p.toast({ title: "Error", description: error.message || "Failed to deactivate user", variant: "destructive" });
    },
  });

  const reactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/super-admin/users/${userId}/reactivate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/metrics"] });
      if (p.selectedUser) {
        p.setSelectedUser({ ...p.selectedUser, isActive: true });
      }
      p.toast({ title: "Success", description: "User reactivated successfully" });
    },
    onError: (error: any) => {
      p.toast({ title: "Error", description: error.message || "Failed to reactivate user", variant: "destructive" });
    },
  });

  const toggleVoiceAccessMutation = useMutation({
    mutationFn: async ({ userId, hasVoiceAccess }: { userId: string; hasVoiceAccess: boolean }) => {
      return await apiRequest("PATCH", `/api/super-admin/users/${userId}/voice-access`, { hasVoiceAccess });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      if (p.selectedUser) {
        p.setSelectedUser({ ...p.selectedUser, hasVoiceAccess: variables.hasVoiceAccess });
      }
      p.toast({ title: "Success", description: "Voice access updated successfully" });
    },
    onError: (error: any) => {
      p.toast({ title: "Error", description: error.message || "Failed to update voice access", variant: "destructive" });
    },
  });

  return {
    addUserToTenantMutation,
    createUserMutation,
    deactivateUserMutation,
    reactivateUserMutation,
    removeUserFromTenantMutation,
    resetPasswordMutation,
    toggleVoiceAccessMutation,
    updateUserMutation,
    updateUserRoleInTenantMutation,
  };
}
