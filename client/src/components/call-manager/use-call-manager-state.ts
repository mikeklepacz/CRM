import { useState } from "react";
import type { CallScenario } from "@/components/call-manager/call-manager.types";

export function useCallManagerState() {
  const [activeScenario, setActiveScenario] = useState<CallScenario>("cold_calls");
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [schedulingMode, setSchedulingMode] = useState<"immediate" | "scheduled" | "auto">("immediate");
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [ivrBehavior, setIvrBehavior] = useState<"flag_and_end" | "flag_and_continue">("flag_and_end");
  const [selectedAgentFilters, setSelectedAgentFilters] = useState<Set<string>>(new Set());
  const [selectedStateFilters, setSelectedStateFilters] = useState<string[]>([]);
  const [showCanadaOnly, setShowCanadaOnly] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<"all" | "sheets" | "leads">("all");
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [selectedCallForDialog, setSelectedCallForDialog] = useState<{ conversationId: string; callData: any } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [callToDelete, setCallToDelete] = useState<string | null>(null);
  const [isNukeDialogOpen, setIsNukeDialogOpen] = useState(false);
  const [isNukeCallDataDialogOpen, setIsNukeCallDataDialogOpen] = useState(false);

  const [insightsDateRange, setInsightsDateRange] = useState<"7days" | "30days" | "custom">("30days");
  const [insightsStartDate, setInsightsStartDate] = useState<string>("");
  const [insightsEndDate, setInsightsEndDate] = useState<string>("");
  const [insightsAgentFilter, setInsightsAgentFilter] = useState<string>("all");
  const [persistedInsights, setPersistedInsights] = useState<any>(null);
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);
  const [insightsViewMode, setInsightsViewMode] = useState<"individual" | "all-time">("individual");

  const [wickCoachStatus, setWickCoachStatus] = useState<"idle" | "running" | "complete" | "error">("idle");
  const [wickCoachCallCount, setWickCoachCallCount] = useState<number>(0);
  const [wickCoachError, setWickCoachError] = useState<string | null>(null);
  const [alignerStatus, setAlignerStatus] = useState<"idle" | "running" | "complete" | "error">("idle");
  const [alignerCallCount, setAlignerCallCount] = useState<number>(0);
  const [alignerKbFileCount, setAlignerKbFileCount] = useState<number>(0);
  const [alignerError, setAlignerError] = useState<string | null>(null);

  const [analyticsAgentFilter, setAnalyticsAgentFilter] = useState<string>("all");
  const [analyticsDateFilter, setAnalyticsDateFilter] = useState<string>("all");
  const [analyticsStatusFilter, setAnalyticsStatusFilter] = useState<string>("all");
  const [analyticsInterestFilter, setAnalyticsInterestFilter] = useState<string>("all");
  const [syncingCalls, setSyncingCalls] = useState(false);

  const [historyPage, setHistoryPage] = useState(1);
  const [historyStartDate, setHistoryStartDate] = useState<string>("");
  const [historyEndDate, setHistoryEndDate] = useState<string>("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("all");
  const [historyCampaignFilter, setHistoryCampaignFilter] = useState<string>("all");
  const [historyAgentFilter, setHistoryAgentFilter] = useState<string>("all");
  const [historySearchQuery, setHistorySearchQuery] = useState<string>("");

  const [storeDetailsDialog, setStoreDetailsDialog] = useState<{ open: boolean; row: any } | null>(null);
  const [storeDetailsLoading, setStoreDetailsLoading] = useState<string | null>(null);
  const [contextUpdateTrigger, setContextUpdateTrigger] = useState(0);

  return {
    activeScenario,
    selectedStores,
    selectedAgent,
    schedulingMode,
    scheduledTime,
    ivrBehavior,
    selectedAgentFilters,
    selectedStateFilters,
    showCanadaOnly,
    sourceFilter,
    isCallDialogOpen,
    selectedCallForDialog,
    isDeleteDialogOpen,
    callToDelete,
    isNukeDialogOpen,
    isNukeCallDataDialogOpen,
    insightsDateRange,
    insightsStartDate,
    insightsEndDate,
    insightsAgentFilter,
    persistedInsights,
    selectedInsightId,
    insightsViewMode,
    wickCoachStatus,
    wickCoachCallCount,
    wickCoachError,
    alignerStatus,
    alignerCallCount,
    alignerKbFileCount,
    alignerError,
    analyticsAgentFilter,
    analyticsDateFilter,
    analyticsStatusFilter,
    analyticsInterestFilter,
    syncingCalls,
    historyPage,
    historyStartDate,
    historyEndDate,
    historyStatusFilter,
    historyCampaignFilter,
    historyAgentFilter,
    historySearchQuery,
    storeDetailsDialog,
    storeDetailsLoading,
    contextUpdateTrigger,
    setActiveScenario,
    setSelectedStores,
    setSelectedAgent,
    setSchedulingMode,
    setScheduledTime,
    setIvrBehavior,
    setSelectedAgentFilters,
    setSelectedStateFilters,
    setShowCanadaOnly,
    setSourceFilter,
    setIsCallDialogOpen,
    setSelectedCallForDialog,
    setIsDeleteDialogOpen,
    setCallToDelete,
    setIsNukeDialogOpen,
    setIsNukeCallDataDialogOpen,
    setInsightsDateRange,
    setInsightsStartDate,
    setInsightsEndDate,
    setInsightsAgentFilter,
    setPersistedInsights,
    setSelectedInsightId,
    setInsightsViewMode,
    setWickCoachStatus,
    setWickCoachCallCount,
    setWickCoachError,
    setAlignerStatus,
    setAlignerCallCount,
    setAlignerKbFileCount,
    setAlignerError,
    setAnalyticsAgentFilter,
    setAnalyticsDateFilter,
    setAnalyticsStatusFilter,
    setAnalyticsInterestFilter,
    setSyncingCalls,
    setHistoryPage,
    setHistoryStartDate,
    setHistoryEndDate,
    setHistoryStatusFilter,
    setHistoryCampaignFilter,
    setHistoryAgentFilter,
    setHistorySearchQuery,
    setStoreDetailsDialog,
    setStoreDetailsLoading,
    setContextUpdateTrigger,
  };
}
