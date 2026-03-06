import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ApolloPrescreenResultRow } from "../types";

type ToastFn = (args: { title: string; description?: string; variant?: "default" | "destructive" }) => void;

export function useApolloPrescreenResults(params: {
  currentProjectId?: string;
  toast: ToastFn;
}) {
  const { currentProjectId, toast } = params;

  const prescreenQuery = useQuery<{ results: ApolloPrescreenResultRow[] }>({
    queryKey: ["/api/apollo/prescreen-results", currentProjectId],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (currentProjectId) {
        query.set("projectId", currentProjectId);
      }
      const response = await fetch(`/api/apollo/prescreen-results?${query.toString()}`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch pre-screen results");
      }
      return response.json();
    },
    enabled: !!currentProjectId,
  });

  const decisionMutation = useMutation({
    mutationFn: async ({ candidateId, decision }: { candidateId: string; decision: "approved" | "rejected" }) => {
      return apiRequest("PATCH", `/api/apollo/prescreen-results/${candidateId}/decision`, {
        projectId: currentProjectId,
        decision,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/prescreen-results", currentProjectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/leads-without-emails", currentProjectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/check-enrichment"] });
      toast({ title: "Decision saved" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to save decision", description: error.message, variant: "destructive" });
    },
  });

  return {
    prescreenResults: prescreenQuery.data,
    prescreenLoading: prescreenQuery.isLoading,
    setPrescreenDecision: (candidateId: string, decision: "approved" | "rejected") =>
      decisionMutation.mutate({ candidateId, decision }),
    isSavingPrescreenDecision: decisionMutation.isPending,
  };
}
