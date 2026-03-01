import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface UseEhubConfigMutationsProps {
  toast: (props: { title: string; description: string; variant?: "default" | "destructive" }) => void;
  userPreferences?: { blacklistCheckEnabled?: boolean };
}

export function useEhubConfigMutations(props: UseEhubConfigMutationsProps) {
  const deleteEmailAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/email-accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-accounts"] });
      props.toast({ title: "Email Disconnected", description: "The email account has been removed" });
    },
    onError: (error: any) => {
      props.toast({ title: "Error", description: error.message || "Failed to disconnect email", variant: "destructive" });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/ehub/settings", data),
    onSuccess: async () => {
      props.toast({
        title: "Settings Updated",
        description: "Queue is being rescheduled with new settings. Coordinator will pick up changes on next tick.",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/ehub/settings"] });
    },
    onError: (error: any) => {
      props.toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const updateBlacklistPreferenceMutation = useMutation({
    mutationFn: (enabled: boolean) => apiRequest("PUT", "/api/user/preferences", { blacklistCheckEnabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      props.toast({
        title: "Blacklist Check " + (props.userPreferences?.blacklistCheckEnabled ? "Disabled" : "Enabled"),
        description: props.userPreferences?.blacklistCheckEnabled
          ? "Blacklist checking is now OFF (for testing)"
          : "Blacklist checking is now ON",
      });
    },
    onError: (error: any) => {
      props.toast({
        title: "Error",
        description: error.message || "Failed to update preference",
        variant: "destructive",
      });
    },
  });

  return {
    deleteEmailAccountMutation,
    updateBlacklistPreferenceMutation,
    updateSettingsMutation,
  };
}
