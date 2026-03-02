import type { FranchiseGroup } from "@shared/franchiseUtils";
import { handleVCardExportFlow } from "@/components/client-dashboard/vcard-export-flow";
import { ClientDashboardMainFrame } from "@/components/client-dashboard/client-dashboard-main-frame";
import { ClientDashboardDialogSections } from "@/components/client-dashboard/client-dashboard-dialog-sections";

export function ClientDashboardPageView(props: any) {
  return (
    <>
      <ClientDashboardMainFrame
        allCountries={props.derived.allCountries}
        allStates={props.derived.allStates}
        autoFitColumns={props.uiHandlers.autoFitColumns}
        citiesInSelectedStates={props.derived.citiesInSelectedStates}
        cityCounts={props.derived.cityCounts}
        cityFilter={props.state.cityFilter}
        citySearchTerm={props.state.citySearchTerm}
        clearAllStates={props.uiHandlers.clearAllStates}
        colorPresets={props.colorPresets}
        colorRowByStatus={props.colorRowByStatus}
        columnOrder={props.state.columnOrder}
        columnWidths={props.state.columnWidths}
        contextMenuColumn={props.state.contextMenuColumn}
        countryCounts={props.derived.countryCounts}
        currentColors={props.currentColors}
        currentUser={props.currentUser}
        customColors={props.state.customColors}
        data={props.data}
        deleteColorPreset={props.deleteColorPreset}
        editableColumns={props.editableColumns}
        editedCells={props.state.editedCells}
        filteredData={props.derived.filteredData}
        fontSize={props.state.fontSize}
        formatHours={props.formatHours}
        freezeFirstColumn={props.state.freezeFirstColumn}
        getUniqueColumnValues={props.uiHandlers.getUniqueColumnValues}
        handleCellEdit={props.gridHandlers.handleCellEdit}
        handleCellUpdate={props.gridHandlers.handleCellUpdate}
        handleManualRefresh={props.uiHandlers.handleManualRefresh}
        handleSort={props.uiHandlers.handleSort}
        headers={props.headers}
        isAdmin={props.isAdmin}
        isEmailCrawling={props.state.isEmailCrawling}
        isLoading={props.isLoading}
        isRefreshing={props.state.isRefreshing}
        moveColumnLeft={props.uiHandlers.moveColumnLeft}
        moveColumnRight={props.uiHandlers.moveColumnRight}
        nameFilter={props.state.nameFilter}
        onCallHistoryOpen={() => props.state.setCallHistoryOpen(true)}
        onExportVCardOpen={() => {
          props.state.setVCardListName("");
          props.state.setExportVCardDialogOpen(true);
        }}
        onFindEmails={props.uiHandlers.handleFindEmails}
        onOpenDuplicateFinder={() => props.state.setDuplicateFinderOpen(true)}
        onOpenFranchiseFinder={() => props.state.setFranchiseFinderOpen(true)}
        openCombobox={props.state.openCombobox}
        openExpandedView={props.gridHandlers.openExpandedView}
        openStoreDetailsFromTableRow={props.gridHandlers.openStoreDetailsFromTableRow}
        rowHeight={props.state.rowHeight}
        rowVirtualizer={props.derived.rowVirtualizer}
        saveAllStatusColors={props.saveAllStatusColors}
        searchTerm={props.state.searchTerm}
        selectAllStates={props.uiHandlers.selectAllStates}
        selectedCities={props.state.selectedCities}
        selectedCountries={props.state.selectedCountries}
        selectedFranchise={props.state.selectedFranchise}
        selectedStates={props.state.selectedStates}
        selectedStatuses={props.state.selectedStatuses}
        setCityFilter={props.state.setCityFilter}
        setCitySearchTerm={props.state.setCitySearchTerm}
        setColorPresets={props.setColorPresets}
        setColorRowByStatus={props.setColorRowByStatus}
        setColumnOrder={props.state.setColumnOrder}
        setContextMenuColumn={props.state.setContextMenuColumn}
        setFontSize={props.state.setFontSize}
        setFreezeFirstColumn={props.state.setFreezeFirstColumn}
        setNameFilter={props.state.setNameFilter}
        setOpenCombobox={props.state.setOpenCombobox}
        setResizingColumn={props.state.setResizingColumn}
        setRowHeight={props.state.setRowHeight}
        setSearchTerm={props.state.setSearchTerm}
        setSelectedCities={props.state.setSelectedCities}
        setSelectedCountries={props.state.setSelectedCountries}
        setSelectedFranchise={props.state.setSelectedFranchise}
        setSelectedStates={props.state.setSelectedStates}
        setSelectedStatuses={props.state.setSelectedStatuses}
        setShowCanadaOnly={props.state.setShowCanadaOnly}
        setShowMyStoresOnly={props.state.setShowMyStoresOnly}
        setShowStateless={props.state.setShowStateless}
        setShowUnclaimedOnly={props.state.setShowUnclaimedOnly}
        setSortColumn={props.state.setSortColumn}
        setSortDirection={props.state.setSortDirection}
        setTextAlign={props.state.setTextAlign}
        setVerticalAlign={props.state.setVerticalAlign}
        setVisibleColumns={props.state.setVisibleColumns}
        showCanadaOnly={props.state.showCanadaOnly}
        showMyStoresOnly={props.state.showMyStoresOnly}
        showStateless={props.state.showStateless}
        showUnclaimedOnly={props.state.showUnclaimedOnly}
        sortColumn={props.state.sortColumn}
        sortDirection={props.state.sortDirection}
        stateCounts={props.derived.stateCounts}
        statelessCount={props.derived.statelessCount}
        statusColors={props.statusColors}
        statusOptions={props.statusOptions}
        storeSheetId={props.state.storeSheetId}
        tableContainerRef={props.state.tableContainerRef}
        textAlign={props.state.textAlign}
        toggleColumn={props.uiHandlers.toggleColumn}
        toggleState={props.uiHandlers.toggleState}
        toast={props.toast}
        trackerHeaders={props.trackerHeaders}
        trackerSheetId={props.state.trackerSheetId}
        verticalAlign={props.state.verticalAlign}
        visibleColumns={props.state.visibleColumns}
        visibleHeaders={props.derived.visibleHeaders}
      />

      <ClientDashboardDialogSections
        addressEditDialog={props.state.addressEditDialog}
        callHistoryOpen={props.state.callHistoryOpen}
        contextUpdateTrigger={props.state.contextUpdateTrigger}
        currentColors={props.currentColors}
        data={props.data}
        duplicateFinderOpen={props.state.duplicateFinderOpen}
        expandedCell={props.state.expandedCell}
        exportVCardDialogOpen={props.state.exportVCardDialogOpen}
        filteredData={props.derived.filteredData}
        franchiseFinderOpen={props.state.franchiseFinderOpen}
        joinColumn={props.joinColumn}
        loadDefaultScriptTrigger={props.state.loadDefaultScriptTrigger}
        onAddressClose={() => props.state.setAddressEditDialog(null)}
        onCallHistoryOpenChange={props.state.setCallHistoryOpen}
        onContextUpdateTriggerChange={props.state.setContextUpdateTrigger}
        onDial={(phoneNumber: string) => props.voip.makeCall(phoneNumber)}
        onDuplicatesDeleted={() => {
          props.refetch();
        }}
        onDuplicateFinderOpenChange={props.state.setDuplicateFinderOpen}
        onExpandedClose={() => props.state.setExpandedCell(null)}
        onExpandedOpenChange={(open: boolean) => {
          if (!open) {
            props.state.setExpandedCell(null);
          }
        }}
        onExpandedSave={props.gridHandlers.saveExpandedCell}
        onExpandedValueChange={(value: string) => {
          if (props.state.expandedCell) {
            props.state.setExpandedCell({ ...props.state.expandedCell, value });
          }
        }}
        onFranchiseFinderOpenChange={props.state.setFranchiseFinderOpen}
        onLoadDefaultScriptTriggerChange={props.state.setLoadDefaultScriptTrigger}
        onNavigateToStore={(newRow: any) => {
          props.state.setStoreDetailsDialog({ open: true, row: newRow });
        }}
        onSelectFranchise={(franchise: FranchiseGroup) => {
          props.state.setSelectedFranchise(franchise);
          props.state.setShowMyStoresOnly(false);
        }}
        onShowStore={(matchingStore: any) => {
          props.state.setStoreDetailsDialog({ open: true, row: matchingStore });
          props.state.setLoadDefaultScriptTrigger((prev: number) => prev + 1);
        }}
        onStoreDetailsClose={() => {
          props.state.setStoreDetailsDialog(null);
          props.state.setLoadDefaultScriptTrigger(0);
        }}
        onVCardCancel={() => props.state.setExportVCardDialogOpen(false)}
        onVCardConfirm={() =>
          handleVCardExportFlow({
            filteredData: props.derived.filteredData,
            queryClient: props.queryClient,
            setExportVCardDialogOpen: props.state.setExportVCardDialogOpen,
            toast: props.toast,
            vCardExportFields: props.state.vCardExportFields,
            vCardListName: props.state.vCardListName,
            vCardPlatform: props.state.vCardPlatform,
          })
        }
        onVCardFieldsChange={props.state.setVCardExportFields}
        onVCardListNameChange={props.state.setVCardListName}
        onVCardOpenChange={props.state.setExportVCardDialogOpen}
        onVCardPlatformChange={props.state.setVCardPlatform}
        platform={props.state.vCardPlatform}
        refetch={props.refetch}
        statusColors={props.statusColors}
        statusOptions={props.statusOptions}
        storeDetailsDialog={props.state.storeDetailsDialog}
        storeSheetId={props.state.storeSheetId}
        trackerSheetId={props.state.trackerSheetId}
        vCardExportFields={props.state.vCardExportFields}
        vCardListName={props.state.vCardListName}
      />
    </>
  );
}
