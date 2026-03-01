import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { canAccessAdminFeatures } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCustomTheme } from "@/hooks/use-custom-theme";
import { useOptionalProject } from "@/contexts/project-context";
import { scenarioDescriptions } from "@/components/call-manager/call-manager.constants";
import { CallManagerPageView } from "@/components/call-manager/call-manager-page-view";
import { useCallManagerState } from "@/components/call-manager/use-call-manager-state";
import { useCallManagerQueries } from "@/components/call-manager/use-call-manager-queries";
import { useCallManagerDerived } from "@/components/call-manager/use-call-manager-derived";
import { useCallManagerMutations } from "@/components/call-manager/use-call-manager-mutations";
import { useCallManagerHandlers } from "@/components/call-manager/use-call-manager-handlers";
import { useCallManagerEffects } from "@/components/call-manager/use-call-manager-effects";

export default function CallManager() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const projectContext = useOptionalProject();
  const currentProject = projectContext?.currentProject;
  const state = useCallManagerState();

  const canAccessAdmin = canAccessAdminFeatures(user);
  const hasAccess = canAccessAdmin || !!user?.hasVoiceAccess;

  const queries = useCallManagerQueries({
    activeScenario: state.activeScenario,
    canAccessAdmin,
    currentProjectId: currentProject?.id,
    hasAccess,
    insightsAgentFilter: state.insightsAgentFilter,
  });

  const { statusOptions, statusColors, currentColors } = useCustomTheme();

  const derived = useCallManagerDerived({
    analyticsAgentFilter: state.analyticsAgentFilter,
    analyticsData: queries.analyticsData,
    analyticsDateFilter: state.analyticsDateFilter,
    analyticsInterestFilter: state.analyticsInterestFilter,
    analyticsStatusFilter: state.analyticsStatusFilter,
    eligibleStores: queries.eligibleStores,
    insightsHistory: queries.insightsHistory,
    insightsViewMode: state.insightsViewMode,
    selectedAgentFilters: state.selectedAgentFilters,
    selectedStateFilters: state.selectedStateFilters,
    showCanadaOnly: state.showCanadaOnly,
    sourceFilter: state.sourceFilter,
  });

  const mutations = useCallManagerMutations({
    insightsAgentFilter: state.insightsAgentFilter,
    insightsDateRange: state.insightsDateRange,
    insightsEndDate: state.insightsEndDate,
    insightsStartDate: state.insightsStartDate,
    refetchStores: queries.refetchStores,
    selectedStores: state.selectedStores,
    setAlignerError: state.setAlignerError,
    setAlignerStatus: state.setAlignerStatus,
    setCallToDelete: state.setCallToDelete,
    setIsDeleteDialogOpen: state.setIsDeleteDialogOpen,
    setIsNukeCallDataDialogOpen: state.setIsNukeCallDataDialogOpen,
    setIsNukeDialogOpen: state.setIsNukeDialogOpen,
    setPersistedInsights: state.setPersistedInsights,
    setSelectedInsightId: state.setSelectedInsightId,
    setSelectedStores: state.setSelectedStores,
    setWickCoachCallCount: state.setWickCoachCallCount,
    setWickCoachError: state.setWickCoachError,
    setWickCoachStatus: state.setWickCoachStatus,
    toast,
  });

  const handlers = useCallManagerHandlers({
    activeScenario: state.activeScenario,
    agents: queries.agents,
    apiRequest,
    batchCallMutation: mutations.batchCallMutation,
    currentProjectId: currentProject?.id,
    eligibleStores: queries.eligibleStores,
    filteredStores: derived.filteredStores,
    ivrBehavior: state.ivrBehavior,
    queryClient,
    scheduledTime: state.scheduledTime,
    schedulingMode: state.schedulingMode,
    selectedAgent: state.selectedAgent,
    selectedAgentFilters: state.selectedAgentFilters,
    selectedStateFilters: state.selectedStateFilters,
    selectedStores: state.selectedStores,
    setSelectedAgentFilters: state.setSelectedAgentFilters,
    setSelectedStateFilters: state.setSelectedStateFilters,
    setSelectedStores: state.setSelectedStores,
    setSyncingCalls: state.setSyncingCalls,
    toast,
  });

  useCallManagerEffects({
    activeScenario: state.activeScenario,
    canAccessAdmin,
    insightsHistory: queries.insightsHistory,
    persistedInsights: state.persistedInsights,
    selectedInsightId: state.selectedInsightId,
    setLocation,
    setPersistedInsights: state.setPersistedInsights,
    setSelectedAgentFilters: state.setSelectedAgentFilters,
    setSelectedInsightId: state.setSelectedInsightId,
    setSelectedStateFilters: state.setSelectedStateFilters,
    setSelectedStores: state.setSelectedStores,
    user,
  });

  if (!hasAccess) {
    return null;
  }

  const queueStats = {
    active: queries.callQueueStats?.activeCalls || 0,
    queued: queries.callQueueStats?.queuedCalls || 0,
    completed: queries.callQueueStats?.completedToday || 0,
    failed: queries.callQueueStats?.failedToday || 0,
  };

  const sheets = queries.sheetsData?.sheets || [];
  const storeSheetId = sheets.find((sheet) => sheet.sheetPurpose === "Store Database")?.id;
  const trackerSheetId = sheets.find((sheet) => sheet.sheetPurpose === "commissions")?.id;

  return (
    <CallManagerPageView
      canAccessAdmin={canAccessAdmin}
      currentColors={currentColors}
      derived={derived}
      handlers={handlers}
      mutations={mutations}
      queries={queries}
      queueStats={queueStats}
      scenarioDescriptions={scenarioDescriptions}
      state={state}
      statusColors={statusColors}
      statusOptions={statusOptions}
      storeSheetId={storeSheetId}
      toast={toast}
      trackerSheetId={trackerSheetId}
    />
  );
}
