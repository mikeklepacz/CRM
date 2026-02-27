import { ClientDashboardFrame } from "@/components/client-dashboard/client-dashboard-frame";
import { MissingSheetsNotice } from "@/components/client-dashboard/missing-sheets-notice";
import { ClientDashboardDataTableSection } from "@/components/client-dashboard/client-dashboard-data-table-section";
import { ClientDashboardMainControls } from "@/components/client-dashboard/client-dashboard-main-controls";

export function ClientDashboardMainFrame(props: any) {
  const {
    allCountries,
    allStates,
    autoFitColumns,
    citiesInSelectedStates,
    cityCounts,
    cityFilter,
    citySearchTerm,
    clearAllStates,
    colorPresets,
    colorRowByStatus,
    columnOrder,
    columnWidths,
    contextMenuColumn,
    currentColors,
    currentUser,
    customColors,
    data,
    deleteColorPreset,
    editableColumns,
    editedCells,
    filteredData,
    fontSize,
    formatHours,
    freezeFirstColumn,
    getUniqueColumnValues,
    handleCellEdit,
    handleCellUpdate,
    handleManualRefresh,
    handleSort,
    headers,
    isAdmin,
    isEmailCrawling,
    isLoading,
    isRefreshing,
    moveColumnLeft,
    moveColumnRight,
    nameFilter,
    openCombobox,
    openStoreDetailsFromTableRow,
    rowHeight,
    rowVirtualizer,
    saveAllStatusColors,
    searchTerm,
    selectAllStates,
    selectedCities,
    selectedCountries,
    selectedFranchise,
    selectedStates,
    selectedStatuses,
    setCityFilter,
    setCitySearchTerm,
    setColorPresets,
    setColorRowByStatus,
    setColumnOrder,
    setContextMenuColumn,
    setFontSize,
    setFreezeFirstColumn,
    setOpenCombobox,
    setRowHeight,
    setSearchTerm,
    setSelectedCities,
    setSelectedCountries,
    setSelectedFranchise,
    setSelectedStates,
    setSelectedStatuses,
    setShowCanadaOnly,
    setShowMyStoresOnly,
    setShowStateless,
    setShowUnclaimedOnly,
    setSortColumn,
    setSortDirection,
    setTextAlign,
    setVerticalAlign,
    setVisibleColumns,
    showCanadaOnly,
    showMyStoresOnly,
    showStateless,
    showUnclaimedOnly,
    sortColumn,
    sortDirection,
    stateCounts,
    statelessCount,
    statusColors,
    statusOptions,
    storeSheetId,
    tableContainerRef,
    textAlign,
    toggleColumn,
    toast,
    trackerHeaders,
    trackerSheetId,
    verticalAlign,
    visibleColumns,
    visibleHeaders,
    countryCounts,
    onCallHistoryOpen,
    onExportVCardOpen,
    onFindEmails,
    onOpenDuplicateFinder,
    onOpenFranchiseFinder,
  } = props;

  return (
    <ClientDashboardFrame
      background={customColors.background}
      bodyBackground={customColors.bodyBackground}
      border={customColors.border}
      secondary={customColors.secondary}
      text={customColors.text}
    >
      {!storeSheetId && !trackerSheetId && <MissingSheetsNotice />}

      {storeSheetId && trackerSheetId && <ClientDashboardMainControls {...props} />}

      <ClientDashboardDataTableSection
        bodyProps={{
          columnWidths,
          colorRowByStatus,
          currentUser,
          customColors,
          editableColumns,
          editedCells,
          filteredData,
          fontSize,
          formatHours,
          freezeFirstColumn,
          getUniqueColumnValues,
          handleCellEdit,
          handleCellUpdate,
          headers,
          isAdmin,
          openCombobox,
          openExpandedView: props.openExpandedView,
          openStoreDetailsFromTableRow,
          rowVirtualizer,
          statusColors,
          statusOptions,
          storeSheetId,
          textAlign,
          trackerHeaders,
          trackerSheetId,
          verticalAlign,
          visibleHeaders,
          onOpenComboboxChange: setOpenCombobox,
        }}
        customColors={customColors}
        dataLength={data.length}
        filteredDataLength={filteredData.length}
        headerProps={{
          columnOrder,
          columnWidths,
          contextMenuColumn,
          customColors,
          editableColumns,
          freezeFirstColumn,
          nameFilter,
          cityFilter,
          sortColumn,
          sortDirection,
          visibleHeaders,
          onCityFilterChange: setCityFilter,
          onContextMenuColumnChange: setContextMenuColumn,
          onNameFilterChange: props.setNameFilter,
          onResizeColumnStart: props.setResizingColumn,
          onSort: handleSort,
          onSortColumnChange: setSortColumn,
          onSortDirectionChange: setSortDirection,
          onToggleColumn: toggleColumn,
          onMoveColumnLeft: moveColumnLeft,
          onMoveColumnRight: moveColumnRight,
        }}
        isLoading={isLoading}
        storeSheetId={storeSheetId}
        tableContainerRef={tableContainerRef}
        trackerSheetId={trackerSheetId}
      />
    </ClientDashboardFrame>
  );
}
