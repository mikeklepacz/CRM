import { useQuery } from "@tanstack/react-query";
import type { CallAnalyticsData, CallQueueStats, EligibleStore, ElevenLabsAgent } from "@/components/call-manager/call-manager.types";

interface UseCallManagerQueriesProps {
  activeScenario: string;
  canAccessAdmin: boolean;
  currentProjectId?: string;
  hasAccess: boolean;
  insightsAgentFilter: string;
}

export function useCallManagerQueries(props: UseCallManagerQueriesProps) {
  const { data: agents = [], isLoading: agentsLoading } = useQuery<ElevenLabsAgent[]>({
    queryKey: ["/api/elevenlabs/agents", props.currentProjectId],
    queryFn: async () => {
      const url = new URL("/api/elevenlabs/agents", window.location.origin);
      if (props.currentProjectId) {
        url.searchParams.set("projectId", props.currentProjectId);
      }
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch agents");
      return response.json();
    },
    enabled: props.hasAccess,
  });

  const { data: eligibleStores = [], isLoading: storesLoading, refetch: refetchStores } = useQuery<EligibleStore[]>({
    queryKey: ["/api/elevenlabs/eligible-stores", props.activeScenario, props.currentProjectId],
    queryFn: async () => {
      const url = new URL(`/api/elevenlabs/eligible-stores/${props.activeScenario}`, window.location.origin);
      if (props.currentProjectId) {
        url.searchParams.set("projectId", props.currentProjectId);
      }
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch eligible stores");
      return response.json();
    },
    enabled: props.hasAccess,
  });

  const { data: callQueueStats } = useQuery<CallQueueStats>({
    queryKey: ["/api/elevenlabs/call-queue"],
    enabled: props.hasAccess,
    refetchInterval: 30000,
  });

  const { data: analyticsData, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery<CallAnalyticsData>({
    queryKey: ["/api/elevenlabs/call-analytics", props.currentProjectId],
    queryFn: async () => {
      const url = new URL("/api/elevenlabs/call-analytics", window.location.origin);
      if (props.currentProjectId) {
        url.searchParams.set("projectId", props.currentProjectId);
      }
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch call analytics");
      return response.json();
    },
    enabled: props.hasAccess,
  });

  const { data: sheetsData } = useQuery<{ sheets: { id: string; sheetPurpose: string }[] }>({
    queryKey: ["/api/sheets"],
    enabled: props.hasAccess,
  });

  const { data: preferences } = useQuery<{ autoKbAnalysis?: boolean; kbAnalysisThreshold?: number }>({
    queryKey: ["/api/user/preferences"],
    enabled: props.canAccessAdmin,
  });

  const { data: jobStatus } = useQuery<{ status: "idle" | "running"; job: any }>({
    queryKey: ["/api/analysis/job-status"],
    enabled: props.hasAccess,
    refetchInterval: (query) => (query.state.data?.status === "running" ? 5000 : 60000),
  });

  const { data: voiceProxyStatus } = useQuery<any>({
    queryKey: ["/api/voice-proxy/status"],
    enabled: props.hasAccess,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const { data: insightsHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["/api/elevenlabs/insights-history", props.insightsAgentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (props.insightsAgentFilter && props.insightsAgentFilter !== "all") {
        params.append("agentId", props.insightsAgentFilter);
      }
      params.append("limit", "10");
      const response = await fetch(`/api/elevenlabs/insights-history?${params}`);
      if (!response.ok) throw new Error("Failed to fetch insights history");
      const data = await response.json();
      return data.history || [];
    },
    enabled: props.canAccessAdmin,
  });

  const { data: blockedDayData } = useQuery<{ blocked: boolean; reason: string | null }>({
    queryKey: ["/api/voice/today-blocked"],
    refetchInterval: 60000,
    enabled: props.hasAccess,
  });

  return {
    agents,
    agentsLoading,
    analyticsData,
    analyticsLoading,
    blockedDayData,
    callQueueStats,
    eligibleStores,
    insightsHistory,
    isLoadingHistory,
    jobStatus,
    preferences,
    refetchAnalytics,
    refetchStores,
    sheetsData,
    storesLoading,
    voiceProxyStatus,
  };
}
