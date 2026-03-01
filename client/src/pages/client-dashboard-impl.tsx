import { useQuery, useQueryClient } from "@tanstack/react-query";
import { canAccessAdminFeatures } from "@/lib/authUtils";
import { useOptionalProject } from "@/contexts/project-context";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { useCustomTheme, defaultDarkColors, defaultLightColors } from "@/hooks/use-custom-theme";
import { useTwilioVoip } from "@/hooks/useTwilioVoip";
import { formatHours } from "@/components/client-dashboard/client-dashboard-utils";
import type { GoogleSheet } from "@/components/client-dashboard/client-dashboard.types";
import { getLinkValue } from "@/components/client-dashboard/region-utils";
import { ClientDashboardLoadingScreen } from "@/components/client-dashboard/client-dashboard-loading-screen";
import { ClientDashboardPageView } from "@/components/client-dashboard/client-dashboard-page-view";
import { useClientDashboardMutations } from "@/components/client-dashboard/use-client-dashboard-mutations";
import { useClientDashboardState } from "@/components/client-dashboard/use-client-dashboard-state";
import { useClientDashboardDerived } from "@/components/client-dashboard/use-client-dashboard-derived";
import { useClientDashboardInitEffects } from "@/components/client-dashboard/use-client-dashboard-init-effects";
import { useClientDashboardPersistenceEffects } from "@/components/client-dashboard/use-client-dashboard-persistence-effects";
import { useClientDashboardGridHandlers } from "@/components/client-dashboard/use-client-dashboard-grid-handlers";
import { useClientDashboardUiHandlers } from "@/components/client-dashboard/use-client-dashboard-ui-handlers";

export default function ClientDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const voip = useTwilioVoip();
  const projectContext = useOptionalProject();
  const currentProject = projectContext?.currentProject;
  const joinColumn = "link";
  const { actualTheme } = useTheme();

  const {
    lightColors,
    darkColors,
    currentColors,
    statusColors,
    statusOptions,
    colorRowByStatus,
    setColorRowByStatus,
    saveAllStatusColors,
    colorPresets,
    setColorPresets,
    deleteColorPreset,
  } = useCustomTheme();

  const { data: userPreferences, isFetched: preferencesQueryFetched } = useQuery<any>({
    queryKey: ["/api/user/preferences"],
    staleTime: Infinity,
  });

  const state = useClientDashboardState({
    actualTheme,
    darkColors,
    lightColors,
    userPreferences,
  });

  const { data: sheetsData, isLoading: isLoadingSheets } = useQuery<{ sheets: GoogleSheet[] }>({
    queryKey: ["/api/sheets"],
  });
  const sheets = sheetsData?.sheets || [];

  const { data: currentUser } = useQuery<{ id: string; email?: string; role?: string; agentName?: string }>({
    queryKey: ["/api/auth/user"],
  });

  const isRealAdmin = canAccessAdminFeatures(currentUser);
  const isAdmin = isRealAdmin && !state.viewAsAgent;

  const { data: mergedData, isLoading, refetch } = useQuery({
    queryKey: ["merged-data", state.storeSheetId, state.trackerSheetId, joinColumn, currentProject?.id],
    queryFn: async () => {
      if (!state.storeSheetId || !state.trackerSheetId) return null;
      const response = await fetch("/api/sheets/merged-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          storeSheetId: state.storeSheetId,
          trackerSheetId: state.trackerSheetId,
          joinColumn,
          projectId: currentProject?.id,
        }),
      });
      if (!response.ok) throw new Error("Failed to fetch merged data");
      return response.json();
    },
    enabled: !!state.storeSheetId && !!state.trackerSheetId && currentProject !== undefined,
    staleTime: 0,
  });

  const headers = mergedData?.headers || [];
  const data = mergedData?.data || [];
  const editableColumns = mergedData?.editableColumns || [];
  const trackerHeaders = mergedData?.trackerHeaders || [];

  const { updateCellMutation, upsertTrackerMutation } = useClientDashboardMutations({
    getCurrentUserName: () => (currentUser as any)?.name || "",
    getLinkValue,
    joinColumn,
    queryClient,
    setHasInitializedColors: state.setHasInitializedColors,
    toast,
    trackerSheetId: state.trackerSheetId,
  });

  const derived = useClientDashboardDerived({
    cityFilter: state.cityFilter,
    columnOrder: state.columnOrder,
    data,
    editedCells: state.editedCells,
    headers,
    isRealAdmin,
    nameFilter: state.nameFilter,
    rowHeight: state.rowHeight,
    searchTerm: state.searchTerm,
    selectedCities: state.selectedCities,
    selectedCountries: state.selectedCountries,
    selectedFranchise: state.selectedFranchise,
    selectedStates: state.selectedStates,
    selectedStatuses: state.selectedStatuses,
    showMyStoresOnly: state.showMyStoresOnly,
    showStateless: state.showStateless,
    showUnclaimedOnly: state.showUnclaimedOnly,
    sortColumn: state.sortColumn,
    sortDirection: state.sortDirection,
    tableContainerRef: state.tableContainerRef,
    visibleColumns: state.visibleColumns,
  });

  const gridHandlers = useClientDashboardGridHandlers({
    currentUser,
    expandedCell: state.expandedCell,
    joinColumn,
    mergedData,
    refetch,
    selectedFranchise: state.selectedFranchise,
    setEditedCells: state.setEditedCells,
    setExpandedCell: state.setExpandedCell,
    setLoadDefaultScriptTrigger: state.setLoadDefaultScriptTrigger,
    setStoreDetailsDialog: state.setStoreDetailsDialog,
    storeSheetId: state.storeSheetId,
    toast,
    trackerHeaders,
    trackerSheetId: state.trackerSheetId,
    updateCellMutation,
    upsertTrackerMutation,
    userPreferences,
  });

  const uiHandlers = useClientDashboardUiHandlers({
    allStates: derived.allStates,
    currentProjectId: currentProject?.id,
    data,
    editableColumns,
    filteredData: derived.filteredData,
    fontSize: state.fontSize,
    isEmailCrawling: state.isEmailCrawling,
    refetch,
    searchTerm: state.searchTerm,
    selectedStates: state.selectedStates,
    setColumnOrder: state.setColumnOrder,
    setColumnWidths: state.setColumnWidths,
    setEmailCrawlResults: state.setEmailCrawlResults,
    setIsEmailCrawling: state.setIsEmailCrawling,
    setIsRefreshing: state.setIsRefreshing,
    setSelectedStates: state.setSelectedStates,
    setShowStateless: state.setShowStateless,
    setSortColumn: state.setSortColumn,
    setSortDirection: state.setSortDirection,
    setVisibleColumns: state.setVisibleColumns,
    showStateless: state.showStateless,
    sortColumn: state.sortColumn,
    sortDirection: state.sortDirection,
    toast,
    visibleHeaders: derived.visibleHeaders,
  });

  const statesVersion = derived.allStates.join(",");
  const prefsVersion = (userPreferences?.selectedStates || []).sort().join(",");

  useClientDashboardInitEffects({
    allCountries: derived.allCountries,
    allStates: derived.allStates,
    citiesInSelectedStates: derived.citiesInSelectedStates,
    columnOrder: state.columnOrder,
    columnWidths: state.columnWidths,
    currentUser,
    darkColors,
    data,
    defaultDarkColors,
    defaultLightColors,
    hasInitializedColors: state.hasInitializedColors,
    headers,
    lastProcessedVersion: state.lastProcessedVersion,
    lightColors,
    preferencesLoaded: state.preferencesLoaded,
    preferencesQueryFetched,
    prefsVersion,
    selectedCountries: state.selectedCountries,
    selectedStates: state.selectedStates,
    setColumnOrder: state.setColumnOrder,
    setColumnWidths: state.setColumnWidths,
    setDarkModeColors: state.setDarkModeColors,
    setFontSize: state.setFontSize,
    setFreezeFirstColumn: state.setFreezeFirstColumn,
    setHasInitializedColors: state.setHasInitializedColors,
    setLastProcessedVersion: state.setLastProcessedVersion,
    setLightModeColors: state.setLightModeColors,
    setLoadDefaultScriptTrigger: state.setLoadDefaultScriptTrigger,
    setPreferencesLoaded: state.setPreferencesLoaded,
    setRowHeight: state.setRowHeight,
    setSelectedCities: state.setSelectedCities,
    setSelectedCountries: state.setSelectedCountries,
    setSelectedStates: state.setSelectedStates,
    setShowMyStoresOnly: state.setShowMyStoresOnly,
    setShowStateless: state.setShowStateless,
    setShowUnclaimedOnly: state.setShowUnclaimedOnly,
    setStoreDetailsDialog: state.setStoreDetailsDialog,
    setStoreSheetId: state.setStoreSheetId,
    setTextAlign: state.setTextAlign,
    setTrackerSheetId: state.setTrackerSheetId,
    setVerticalAlign: state.setVerticalAlign,
    setViewAsAgent: state.setViewAsAgent,
    setVisibleColumns: state.setVisibleColumns,
    sheets,
    statesVersion,
    userPreferences,
    voip,
    visibleColumns: state.visibleColumns,
  });

  useClientDashboardPersistenceEffects({
    colorRowByStatus,
    columnOrder: state.columnOrder,
    columnWidths: state.columnWidths,
    editedCells: state.editedCells,
    fontSize: state.fontSize,
    freezeFirstColumn: state.freezeFirstColumn,
    preferencesLoaded: state.preferencesLoaded,
    resizingColumn: state.resizingColumn,
    rowHeight: state.rowHeight,
    selectedCities: state.selectedCities,
    selectedStates: state.selectedStates,
    setColumnWidths: state.setColumnWidths,
    setEditedCells: state.setEditedCells,
    setResizingColumn: state.setResizingColumn,
    showMyStoresOnly: state.showMyStoresOnly,
    showStateless: state.showStateless,
    showUnclaimedOnly: state.showUnclaimedOnly,
    statusOptions,
    textAlign: state.textAlign,
    toast,
    updateCellMutation,
    userPreferences,
    verticalAlign: state.verticalAlign,
    visibleColumns: state.visibleColumns,
  });

  if (isLoadingSheets || isLoading || !state.preferencesLoaded) {
    return <ClientDashboardLoadingScreen bodyBackground={state.customColors.bodyBackground} />;
  }

  return (
    <ClientDashboardPageView
      colorPresets={colorPresets}
      colorRowByStatus={colorRowByStatus}
      currentColors={currentColors}
      currentUser={currentUser}
      data={data}
      deleteColorPreset={deleteColorPreset}
      derived={derived}
      editableColumns={editableColumns}
      formatHours={formatHours}
      gridHandlers={gridHandlers}
      headers={headers}
      isAdmin={isAdmin}
      isLoading={isLoading}
      joinColumn={joinColumn}
      queryClient={queryClient}
      refetch={refetch}
      saveAllStatusColors={saveAllStatusColors}
      setColorPresets={setColorPresets}
      setColorRowByStatus={setColorRowByStatus}
      state={state}
      statusColors={statusColors}
      statusOptions={statusOptions}
      toast={toast}
      trackerHeaders={trackerHeaders}
      uiHandlers={uiHandlers}
      voip={voip}
    />
  );
}
