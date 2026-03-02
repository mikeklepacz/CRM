import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useSuperAdminConfigMutations(props: any) {
  const p = props;

  const updateDirectElevenLabsMutation = useMutation({
    mutationFn: async (useDirectElevenLabs: boolean) => {
      return apiRequest("PATCH", `/api/super-admin/tenants/${p.configTenantId}/elevenlabs-config`, { useDirectElevenLabs });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/super-admin/tenants/${p.configTenantId}/elevenlabs-config`] });
      p.toast({
        title: p.useDirectElevenLabs ? "Direct Mode Enabled" : "Proxy Mode Enabled",
        description: p.useDirectElevenLabs
          ? "Calls will route directly to ElevenLabs (bypassing Fly.io proxy)"
          : "Calls will route through Fly.io proxy",
      });
    },
    onError: (error: Error) => {
      p.toast({
        title: "Error",
        description: error.message || "Failed to update setting",
        variant: "destructive",
      });
    },
  });

  return { updateDirectElevenLabsMutation };
}
