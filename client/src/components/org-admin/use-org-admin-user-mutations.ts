import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CreateUserFormData, InviteFormData, SettingsFormData } from "@/components/org-admin/org-admin-constants";

export function useOrgAdminUserMutations(props: any) {
  const p = props;

  const createInviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      return await apiRequest("POST", "/api/org-admin/invites", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/invites"] });
      p.setIsInviteDialogOpen(false);
      p.inviteForm.reset();
      p.toast({
        title: "Success",
        description: "Invitation sent successfully",
      });
    },
    onError: (error: any) => {
      p.toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      return await apiRequest("POST", "/api/org-admin/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/users"] });
      p.setIsCreateUserDialogOpen(false);
      p.createUserForm.reset();
      p.toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onError: (error: any) => {
      p.toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      return await apiRequest("DELETE", `/api/org-admin/invites/${inviteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/invites"] });
      p.toast({
        title: "Success",
        description: "Invitation cancelled",
      });
    },
    onError: (error: any) => {
      p.toast({
        title: "Error",
        description: error.message || "Failed to cancel invitation",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest("PATCH", `/api/org-admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/users"] });
      p.setRoleChangeUser(null);
      p.toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error: any) => {
      p.toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const editUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Record<string, any> }) => {
      return await apiRequest("PATCH", `/api/org-admin/users/${userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/users"] });
      p.setEditingUser(null);
      p.toast({
        title: "User updated",
        description: "User profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      p.toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/org-admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/stats"] });
      p.setUserToRemove(null);
      p.toast({
        title: "Success",
        description: "User removed from organization",
      });
    },
    onError: (error: any) => {
      p.toast({
        title: "Error",
        description: error.message || "Failed to remove user",
        variant: "destructive",
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      return await apiRequest("PATCH", "/api/org-admin/settings", { settings: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/settings"] });
      p.toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    },
    onError: (error: any) => {
      p.toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  return {
    cancelInviteMutation,
    createInviteMutation,
    createUserMutation,
    editUserMutation,
    removeUserMutation,
    updateRoleMutation,
    updateSettingsMutation,
  };
}
