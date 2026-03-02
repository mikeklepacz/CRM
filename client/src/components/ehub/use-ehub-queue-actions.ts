import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DelayDialogState } from "@/components/ehub/ehub-queue.types";

export function useEhubQueueActions(toast: (args: any) => void) {
  const [delayDialog, setDelayDialog] = useState<DelayDialogState>({
    open: false,
    recipientId: null,
    hours: 1,
  });

  const pauseMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      return await apiRequest("PATCH", `/api/ehub/recipients/${recipientId}/pause`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/paused-recipients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/queue/paused-count"] });
      toast({
        title: "Recipient paused",
        description: "All future sends have been stopped",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to pause recipient",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      return await apiRequest("PATCH", `/api/ehub/recipients/${recipientId}/resume`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/paused-recipients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/queue/paused-count"] });
      toast({
        title: "Recipient resumed",
        description: "Emails will resume sending",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to resume recipient",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const skipStepMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      return await apiRequest("PATCH", `/api/ehub/recipients/${recipientId}/skip-step`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/paused-recipients"] });
      toast({
        title: "Step skipped",
        description: "Advanced to next step without sending",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to skip step",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      return await apiRequest("DELETE", `/api/ehub/recipients/${recipientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/paused-recipients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/queue/paused-count"] });
      toast({
        title: "Recipient removed",
        description: "Removed from sequence completely",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove recipient",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendNowMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      return await apiRequest("POST", `/api/ehub/recipients/${recipientId}/send-now`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/paused-recipients"] });
      toast({
        title: "Email sending now",
        description: "Overriding schedule and sending immediately",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const delayMutation = useMutation({
    mutationFn: async ({ recipientId, hours }: { recipientId: string; hours: number }) => {
      return await apiRequest("PATCH", `/api/ehub/recipients/${recipientId}/delay`, { hours });
    },
    onSuccess: (_: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/paused-recipients"] });
      toast({
        title: "Send delayed",
        description: `Pushed back by ${variables.hours} hour${variables.hours !== 1 ? "s" : ""}`,
      });
      setDelayDialog({ open: false, recipientId: null, hours: 1 });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delay send",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateQueueMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/ehub/queue/generate");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/queue"] });
      toast({
        title: "Queue generated",
        description: "3 days of email slots have been created",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate queue",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rebuildQueueMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/ehub/queue/rebuild");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/paused-recipients"] });
      toast({
        title: "Queue rebuilt",
        description: "All slots have been regenerated with current settings",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to rebuild queue",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    delayDialog,
    setDelayDialog,
    delayMutation,
    generateQueueMutation,
    pauseMutation,
    rebuildQueueMutation,
    removeMutation,
    resumeMutation,
    sendNowMutation,
    skipStepMutation,
  };
}
