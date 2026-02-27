import { ClientDashboardDetailDialogs } from "@/components/client-dashboard/client-dashboard-detail-dialogs";
import { ClientDashboardUtilityDialogs } from "@/components/client-dashboard/client-dashboard-utility-dialogs";

export function ClientDashboardDialogSections(props: any) {
  const {
    addressEditDialog,
    callHistoryOpen,
    contextUpdateTrigger,
    currentColors,
    data,
    duplicateFinderOpen,
    expandedCell,
    exportVCardDialogOpen,
    filteredData,
    franchiseFinderOpen,
    joinColumn,
    loadDefaultScriptTrigger,
    onAddressClose,
    onCallHistoryOpenChange,
    onContextUpdateTriggerChange,
    onDial,
    onDuplicatesDeleted,
    onDuplicateFinderOpenChange,
    onExpandedClose,
    onExpandedOpenChange,
    onExpandedSave,
    onExpandedValueChange,
    onFranchiseFinderOpenChange,
    onLoadDefaultScriptTriggerChange,
    onNavigateToStore,
    onSelectFranchise,
    onShowStore,
    onStoreDetailsClose,
    onVCardCancel,
    onVCardConfirm,
    onVCardFieldsChange,
    onVCardListNameChange,
    onVCardOpenChange,
    onVCardPlatformChange,
    platform,
    refetch,
    statusColors,
    statusOptions,
    storeDetailsDialog,
    storeSheetId,
    trackerSheetId,
    vCardExportFields,
    vCardListName,
  } = props;

  return (
    <>
      <ClientDashboardDetailDialogs
        actionButtonColor={currentColors.actionButtons}
        addressEditDialog={addressEditDialog}
        allVisibleStores={filteredData}
        contextUpdateTrigger={contextUpdateTrigger}
        currentColors={currentColors}
        expandedCell={expandedCell}
        exportVCardDialogOpen={exportVCardDialogOpen}
        filteredCount={filteredData?.length || 0}
        joinColumn={joinColumn}
        listName={vCardListName}
        loadDefaultScriptTrigger={loadDefaultScriptTrigger}
        onAddressClose={onAddressClose}
        onContextUpdateTriggerChange={onContextUpdateTriggerChange}
        onExpandedClose={onExpandedClose}
        onExpandedOpenChange={onExpandedOpenChange}
        onExpandedSave={onExpandedSave}
        onExpandedValueChange={onExpandedValueChange}
        onLoadDefaultScriptTriggerChange={onLoadDefaultScriptTriggerChange}
        onNavigateToStore={onNavigateToStore}
        onStoreDetailsClose={onStoreDetailsClose}
        onVCardCancel={onVCardCancel}
        onVCardConfirm={onVCardConfirm}
        onVCardFieldsChange={onVCardFieldsChange}
        onVCardListNameChange={onVCardListNameChange}
        onVCardOpenChange={onVCardOpenChange}
        onVCardPlatformChange={onVCardPlatformChange}
        platform={platform}
        refetch={refetch}
        statusColors={statusColors}
        statusOptions={statusOptions}
        storeDetailsDialog={storeDetailsDialog}
        storeSheetId={storeSheetId}
        trackerSheetId={trackerSheetId}
        vCardFields={vCardExportFields}
      />

      <ClientDashboardUtilityDialogs
        callHistoryOpen={callHistoryOpen}
        data={data}
        duplicateFinderOpen={duplicateFinderOpen}
        franchiseFinderOpen={franchiseFinderOpen}
        onCallHistoryOpenChange={onCallHistoryOpenChange}
        onDial={onDial}
        onDuplicatesDeleted={onDuplicatesDeleted}
        onDuplicateFinderOpenChange={onDuplicateFinderOpenChange}
        onFranchiseFinderOpenChange={onFranchiseFinderOpenChange}
        onSelectFranchise={onSelectFranchise}
        onShowStore={onShowStore}
      />
    </>
  );
}
