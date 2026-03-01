import { useMemo } from "react";
import { CANADIAN_PROVINCES } from "@/components/call-manager/call-manager.constants";

interface UseCallManagerDerivedProps {
  analyticsAgentFilter: string;
  analyticsData: any;
  analyticsDateFilter: string;
  analyticsInterestFilter: string;
  analyticsStatusFilter: string;
  eligibleStores: any[];
  insightsHistory: any[] | undefined;
  insightsViewMode: "individual" | "all-time";
  selectedAgentFilters: Set<string>;
  selectedStateFilters: string[];
  showCanadaOnly: boolean;
  sourceFilter: "all" | "sheets" | "leads";
}

export function useCallManagerDerived(props: UseCallManagerDerivedProps) {
  const runningJob = props.analyticsData?.status === "running" ? props.analyticsData.job : null;

  const filteredAnalyticsData = useMemo(() => {
    if (!props.analyticsData) return null;

    const filteredCalls = props.analyticsData.calls.filter((call: any) => {
      if (props.analyticsAgentFilter !== "all" && call.session.agentId !== props.analyticsAgentFilter) return false;

      if (props.analyticsDateFilter !== "all" && call.session.startedAt) {
        const callDate = new Date(call.session.startedAt);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - callDate.getTime()) / (1000 * 60 * 60 * 24));
        if (props.analyticsDateFilter === "today" && daysDiff > 0) return false;
        if (props.analyticsDateFilter === "7days" && daysDiff > 7) return false;
        if (props.analyticsDateFilter === "30days" && daysDiff > 30) return false;
      }

      if (props.analyticsStatusFilter !== "all") {
        if (props.analyticsStatusFilter === "successful" && !call.session.callSuccessful) return false;
        if (props.analyticsStatusFilter === "failed" && call.session.callSuccessful) return false;
      }

      if (props.analyticsInterestFilter !== "all" && call.session.interestLevel !== props.analyticsInterestFilter) return false;

      return true;
    });

    const successfulCalls = filteredCalls.filter((call: any) => call.session.callSuccessful).length;
    const failedCalls = filteredCalls.filter((call: any) => !call.session.callSuccessful).length;
    const totalDuration = filteredCalls.reduce((sum: number, call: any) => sum + (call.session.callDurationSecs || 0), 0);
    const avgDuration = filteredCalls.length > 0 ? totalDuration / filteredCalls.length : 0;

    return {
      calls: filteredCalls,
      metrics: {
        totalCalls: filteredCalls.length,
        successfulCalls,
        failedCalls,
        avgDurationSecs: avgDuration,
        interestLevels: {
          hot: filteredCalls.filter((call: any) => call.session.interestLevel === "hot").length,
          warm: filteredCalls.filter((call: any) => call.session.interestLevel === "warm").length,
          cold: filteredCalls.filter((call: any) => call.session.interestLevel === "cold").length,
          notInterested: filteredCalls.filter((call: any) => call.session.interestLevel === "not-interested").length,
        },
      },
    };
  }, [props.analyticsData, props.analyticsAgentFilter, props.analyticsDateFilter, props.analyticsStatusFilter, props.analyticsInterestFilter]);

  const isCanadianProvince = (state: string) => CANADIAN_PROVINCES.includes(state);
  const uniqueAgents = Array.from(new Set(props.eligibleStores.map((store) => store.agentName).filter(Boolean)));
  const allStates = Array.from(new Set(props.eligibleStores.map((store) => store.state).filter(Boolean))).sort();
  const stateCounts = props.eligibleStores.reduce((acc, store) => {
    if (store.state) acc[store.state] = (acc[store.state] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let filteredStores = props.eligibleStores;
  if (props.selectedAgentFilters.size > 0) {
    filteredStores = filteredStores.filter((store) => store.agentName && props.selectedAgentFilters.has(store.agentName));
  }
  if (props.selectedStateFilters.length > 0) {
    filteredStores = filteredStores.filter((store) => store.state && props.selectedStateFilters.includes(store.state));
  }
  if (props.sourceFilter !== "all") {
    filteredStores = filteredStores.filter((store) => store.source === props.sourceFilter);
  }
  if (props.showCanadaOnly) {
    filteredStores = filteredStores.filter((store) => store.state && isCanadianProvince(store.state));
  }

  const sheetsCount = props.eligibleStores.filter((store) => store.source === "sheets").length;
  const leadsCount = props.eligibleStores.filter((store) => store.source === "leads").length;

  const allTimeSummary = useMemo(() => {
    if (props.insightsViewMode !== "all-time" || !props.insightsHistory || props.insightsHistory.length === 0) {
      return null;
    }

    const totalCalls = props.insightsHistory.reduce((sum: number, insight: any) => sum + (insight.callCount || 0), 0);
    return {
      callCount: totalCalls,
      analysisCount: props.insightsHistory.length,
    };
  }, [props.insightsViewMode, props.insightsHistory]);

  return {
    allStates,
    allTimeSummary,
    filteredAnalyticsData,
    filteredStores,
    isCanadianProvince,
    leadsCount,
    runningJob,
    sheetsCount,
    stateCounts,
    uniqueAgents,
  };
}
