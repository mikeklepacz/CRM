import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { agentSchema, configSchema } from "./voice-settings-schemas";
import type { Agent } from "./voice-settings-types";

export function useVoiceSettingsMutations({
  apiBase,
  toast,
  agentForm,
  setIsAddAgentOpen,
  setEditingAgent,
}: {
  apiBase: string;
  toast: any;
  agentForm: UseFormReturn<z.infer<typeof agentSchema>>;
  setIsAddAgentOpen: (open: boolean) => void;
  setEditingAgent: (agent: Agent | null) => void;
}) {
  const queryClient = useQueryClient();

  const updateConfigMutation = useMutation({
    mutationFn: async (data: z.infer<typeof configSchema>) => {
      const response = await apiRequest("PUT", `${apiBase}/config`, data);
      return response.json();
    },
    onSuccess: (data: {
      message: string;
      webhookRegistered?: boolean;
      webhookError?: string | null;
    }) => {
      queryClient.invalidateQueries({ queryKey: [apiBase, "config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/elevenlabs/system-health"] });

      if (data.webhookError) {
        toast({
          title: "Configuration Saved (Webhook Issue)",
          description: `Config saved but webhook registration failed: ${data.webhookError}`,
          variant: "destructive",
        });
      } else if (data.webhookRegistered) {
        toast({
          title: "Success",
          description: "Configuration updated and webhook registered successfully",
        });
      } else {
        toast({
          title: "Success",
          description: "Configuration updated successfully",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createAgentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof agentSchema>) => {
      return await apiRequest("POST", `${apiBase}/agents`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiBase, "agents"] });
      setIsAddAgentOpen(false);
      agentForm.reset();
      toast({
        title: "Success",
        description: "Agent added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `${apiBase}/agents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiBase, "agents"] });
      toast({
        title: "Success",
        description: "Agent deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAgentMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: z.infer<typeof agentSchema>;
    }) => {
      return await apiRequest("PUT", `${apiBase}/agents/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiBase, "agents"] });
      setEditingAgent(null);
      agentForm.reset();
      toast({
        title: "Success",
        description: "Agent updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PUT", `${apiBase}/agents/${id}/set-default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiBase, "agents"] });
      toast({
        title: "Success",
        description: "Default agent updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncPhoneNumbersMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `${apiBase}/sync-phone-numbers`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [apiBase, "agents"] });
      queryClient.invalidateQueries({ queryKey: [apiBase, "phone-numbers"] });
      toast({
        title: "Success",
        description: data.message || "Phone numbers synced successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncAgentSettingsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `${apiBase}/sync-all-agent-settings`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [apiBase, "agents"] });
      toast({
        title: "Success",
        description: data.message || "Agent settings synced successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerWebhookMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `${apiBase}/register-webhook`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [apiBase, "webhook-status"] });
      toast({
        title: "Success",
        description: data.message || "Webhook registered successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateVolumeMutation = useMutation({
    mutationFn: async (volumeDb: number) => {
      return await apiRequest("PUT", "/api/voice-proxy/background-audio/volume", {
        volumeDb,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/voice-proxy/background-audio"],
      });
      toast({
        title: "Success",
        description: "Background audio volume updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    updateConfigMutation,
    createAgentMutation,
    deleteAgentMutation,
    updateAgentMutation,
    setDefaultMutation,
    syncPhoneNumbersMutation,
    syncAgentSettingsMutation,
    registerWebhookMutation,
    updateVolumeMutation,
  };
}
