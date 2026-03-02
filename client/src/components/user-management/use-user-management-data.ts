import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useUserManagementData(params: {
  newUser: any;
  setIsCreateDialogOpen: (open: boolean) => void;
  setNewUser: (value: any) => void;
  setDeactivateDialog: (value: any) => void;
  setDeleteDialog: (value: any) => void;
  setResetPasswordDialog: (value: any) => void;
  setNewPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  toast: any;
}) {
  const { newUser, setIsCreateDialogOpen, setNewUser, setDeactivateDialog, setDeleteDialog, setResetPasswordDialog, setNewPassword, setConfirmPassword, toast } = params;

  const usersQuery = useQuery<{ users: any[] }>({ queryKey: ["/api/users"] });
  const categoriesQuery = useQuery<{ categories: Array<{ id: string; name: string }> }>({ queryKey: ["/api/categories/active"] });

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => await apiRequest("POST", "/api/users", userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateDialogOpen(false);
      setNewUser({
        email: "",
        firstName: "",
        lastName: "",
        agentName: "",
        password: "",
        role: "agent",
        selectedCategory: "",
        referredBy: null,
      });
      toast({ title: "Success", description: "User created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create user", variant: "destructive" });
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => await apiRequest("POST", `/api/users/${userId}/deactivate`, {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDeactivateDialog(null);
      toast({ title: "Success", description: data.message || "User deactivated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to deactivate user", variant: "destructive" });
    },
  });

  const reactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => await apiRequest("POST", `/api/users/${userId}/reactivate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Success", description: "User reactivated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to reactivate user", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => await apiRequest("DELETE", `/api/admin/users/${userId}`, {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDeleteDialog(null);
      toast({ title: "Success", description: data.message || "User permanently deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete user", variant: "destructive" });
    },
  });

  const toggleVoiceAccessMutation = useMutation({
    mutationFn: async ({ userId, hasVoiceAccess }: { userId: string; hasVoiceAccess: boolean }) =>
      await apiRequest("PATCH", `/api/users/${userId}/voice-access`, { hasVoiceAccess }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Success", description: "Voice access updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update voice access", variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      await apiRequest("PATCH", `/api/users/${userId}/reset-password`, { newPassword }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setResetPasswordDialog(null);
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Success", description: "Password reset successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to reset password", variant: "destructive" });
    },
  });

  return {
    usersQuery,
    categoriesQuery,
    createUserMutation,
    deactivateUserMutation,
    reactivateUserMutation,
    deleteUserMutation,
    toggleVoiceAccessMutation,
    resetPasswordMutation,
  };
}
