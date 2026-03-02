import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useCallManagerMutations(props: any) {
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: { autoKbAnalysis?: boolean; kbAnalysisThreshold?: number }) => {
      return apiRequest("PUT", "/api/user/preferences", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      props.toast({ title: "Settings Updated", description: "Auto-trigger preferences saved successfully" });
    },
    onError: () => {
      props.toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
    },
  });

  const batchCallMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/elevenlabs/batch-call", data),
    onSuccess: () => {
      props.toast({ title: "Calls Queued", description: `${props.selectedStores.size} calls have been queued successfully.` });
      props.setSelectedStores(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/elevenlabs/call-queue"] });
      props.refetchStores();
    },
    onError: (error: any) => {
      props.toast({ title: "Error", description: error.message || "Failed to queue calls", variant: "destructive" });
    },
  });

  const deleteCallMutation = useMutation({
    mutationFn: async (callId: string) => apiRequest("DELETE", `/api/elevenlabs/calls/${callId}`),
    onSuccess: (data: any) => {
      props.toast({ title: "Call Deleted", description: data.message || "Call has been deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/elevenlabs/call-analytics"] });
      props.setIsDeleteDialogOpen(false);
      props.setCallToDelete(null);
    },
    onError: (error: any) => {
      const errorMessage = error.details ? `${error.message}\n\nDetails: ${error.details}` : error.message || "Failed to delete call";
      props.toast({ title: "Error", description: errorMessage, variant: "destructive" });
    },
  });

  const analyzeCallsMutation = useMutation({
    mutationFn: async () => {
      let startDate;
      let endDate;
      const now = new Date();

      if (props.insightsDateRange === "7days") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        endDate = now.toISOString();
      } else if (props.insightsDateRange === "30days") {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        endDate = now.toISOString();
      } else {
        startDate = props.insightsStartDate;
        endDate = props.insightsEndDate;
      }

      props.setWickCoachStatus("running");
      props.setWickCoachCallCount(0);
      props.setWickCoachError(null);
      props.setAlignerStatus("idle");
      props.setAlignerError(null);

      return apiRequest("POST", "/api/elevenlabs/analyze-calls", {
        startDate,
        endDate,
        agentId: props.insightsAgentFilter !== "all" ? props.insightsAgentFilter : undefined,
        limit: 50,
      });
    },
    onSuccess: (data: any) => {
      props.setPersistedInsights(data);
      props.setSelectedInsightId(data.id || null);
      props.setWickCoachStatus("complete");
      props.setWickCoachCallCount(data.callCount || 0);
      queryClient.invalidateQueries({ queryKey: ["/api/elevenlabs/insights-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kb/proposals"] });
      props.toast({ title: "Analysis Complete", description: "AI insights have been generated from your call data" });
      setTimeout(() => {
        props.setWickCoachStatus("idle");
        props.setAlignerStatus("idle");
      }, 5000);
    },
    onError: (error: any) => {
      props.setWickCoachStatus("error");
      props.setWickCoachError(error.message || "Failed to analyze calls");
      setTimeout(() => {
        props.setWickCoachStatus("idle");
        props.setWickCoachError(null);
      }, 5000);
      props.toast({ variant: "destructive", title: "Analysis Failed", description: error.message || "Failed to analyze calls" });
    },
  });

  const nukeAnalysisMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/elevenlabs/nuke-analysis", {}),
    onSuccess: () => {
      props.setIsNukeDialogOpen(false);
      props.setPersistedInsights(null);
      props.setSelectedInsightId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/elevenlabs/insights-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/elevenlabs/call-analytics"] });
      props.toast({ title: "Analysis Data Cleared", description: "All analysis data has been reset. Calls can now be re-analyzed." });
    },
    onError: (error: any) => {
      props.toast({ variant: "destructive", title: "Nuke Failed", description: error.message || "Failed to clear analysis data" });
    },
  });

  const nukeCallDataMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/elevenlabs/nuke-call-data", {}),
    onSuccess: (data: any) => {
      props.setIsNukeCallDataDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/elevenlabs/call-queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/elevenlabs/call-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-history"] });
      props.toast({ title: "Call Data Cleared", description: data?.message || "All call test data has been deleted." });
    },
    onError: (error: any) => {
      props.toast({ variant: "destructive", title: "Nuke Failed", description: error.message || "Failed to clear call data" });
    },
  });

  return {
    analyzeCallsMutation,
    batchCallMutation,
    deleteCallMutation,
    nukeAnalysisMutation,
    nukeCallDataMutation,
    updatePreferencesMutation,
  };
}
