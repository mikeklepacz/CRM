import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface UseEhubStrategyMutationsProps {
  refetchSteps: () => void;
  selectedSequenceId: string | null;
  setEditStepDialogOpen: (open: boolean) => void;
  setFinalizedStrategyEdit: (value: string) => void;
  setStrategyMessage: (value: string) => void;
  toast: (props: { title: string; description: string; variant?: "default" | "destructive" }) => void;
}

export function useEhubStrategyMutations(props: UseEhubStrategyMutationsProps) {
  const saveFinalizedStrategyMutation = useMutation({
    mutationFn: async (text: string) => {
      return await apiRequest("PATCH", `/api/sequences/${props.selectedSequenceId}/finalized-strategy`, {
        finalizedStrategy: text,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      props.toast({
        title: "Success",
        description: "Campaign strategy saved successfully",
      });
    },
    onError: (error: any) => {
      props.toast({
        title: "Error",
        description: error.message || "Failed to save strategy",
        variant: "destructive",
      });
    },
  });

  const generateFinalizedStrategyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/sequences/${props.selectedSequenceId}/finalize-strategy`);
    },
    onSuccess: (data: any) => {
      props.setFinalizedStrategyEdit(data.finalizedStrategy);
      saveFinalizedStrategyMutation.mutate(data.finalizedStrategy);
    },
    onError: (error: any) => {
      props.toast({
        title: "Error",
        description: error.message || "Failed to generate strategy brief",
        variant: "destructive",
      });
    },
  });

  const sendStrategyChatMutation = useMutation({
    mutationFn: async (message: string) => {
      return await apiRequest("POST", `/api/sequences/${props.selectedSequenceId}/strategy-chat`, { message });
    },
    onSuccess: () => {
      props.setStrategyMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/sequences", props.selectedSequenceId, "strategy-chat"] });
    },
    onError: (error: any) => {
      props.toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const saveStepDelaysMutation = useMutation({
    mutationFn: async (data: { repeatLastStep: boolean; stepDelays: number[] }) => {
      return await apiRequest("PUT", `/api/sequences/${props.selectedSequenceId}/step-delays`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      props.toast({
        title: "Success",
        description: "Step delays saved successfully",
      });
    },
    onError: (error: any) => {
      props.toast({
        title: "Error",
        description: error.message || "Failed to save step delays",
        variant: "destructive",
      });
    },
  });

  const saveKeywordsMutation = useMutation({
    mutationFn: async (keywords: string) => {
      return await apiRequest("PUT", `/api/sequences/${props.selectedSequenceId}/keywords`, { keywords });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      props.toast({
        title: "Success",
        description: "Keywords saved successfully",
      });
    },
    onError: (error: any) => {
      props.toast({
        title: "Error",
        description: error.message || "Failed to save keywords",
        variant: "destructive",
      });
    },
  });

  const updateStepTemplateMutation = useMutation({
    mutationFn: async ({
      stepId,
      subjectTemplate,
      bodyTemplate,
      aiGuidance,
    }: {
      aiGuidance?: string | null;
      bodyTemplate?: string | null;
      stepId: string;
      subjectTemplate?: string | null;
    }) => {
      return await apiRequest("PATCH", `/api/sequences/${props.selectedSequenceId}/steps/${stepId}`, {
        subjectTemplate,
        bodyTemplate,
        aiGuidance,
      });
    },
    onSuccess: () => {
      props.refetchSteps();
      props.setEditStepDialogOpen(false);
      props.toast({
        title: "Success",
        description: "Step template saved successfully",
      });
    },
    onError: (error: any) => {
      props.toast({
        title: "Error",
        description: error.message || "Failed to save step template",
        variant: "destructive",
      });
    },
  });

  return {
    generateFinalizedStrategyMutation,
    saveFinalizedStrategyMutation,
    saveKeywordsMutation,
    saveStepDelaysMutation,
    sendStrategyChatMutation,
    updateStepTemplateMutation,
  };
}
