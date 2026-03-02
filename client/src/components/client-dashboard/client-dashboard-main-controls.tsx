import { ClientDashboardTopControls } from "@/components/client-dashboard/client-dashboard-top-controls";
import { ClientDashboardFiltersRow } from "@/components/client-dashboard/client-dashboard-filters-row";

export function ClientDashboardMainControls(props: any) {
  const {
    allCountries,
    allStates,
    autoFitColumns,
    citiesInSelectedStates,
    cityCounts,
    citySearchTerm,
    clearAllStates,
    colorPresets,
    colorRowByStatus,
    columnOrder,
    currentColors,
    currentUser,
    customColors,
    data,
    deleteColorPreset,
    editableColumns,
    filteredData,
    fontSize,
    freezeFirstColumn,
    handleManualRefresh,
    headers,
    isAdmin,
    isEmailCrawling,
    isLoading,
    isRefreshing,
    moveColumnLeft,
    moveColumnRight,
    rowHeight,
    saveAllStatusColors,
    searchTerm,
    selectAllStates,
    selectedCities,
    selectedCountries,
    selectedFranchise,
    selectedStates,
    selectedStatuses,
    setCitySearchTerm,
    setColorPresets,
    setColorRowByStatus,
    setFontSize,
    setFreezeFirstColumn,
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
    setTextAlign,
    setVerticalAlign,
    setVisibleColumns,
    setColumnOrder,
    showCanadaOnly,
    showMyStoresOnly,
    showStateless,
    showUnclaimedOnly,
    stateCounts,
    statelessCount,
    statusColors,
    statusOptions,
    textAlign,
    toggleColumn,
    toggleState,
    toast,
    verticalAlign,
    visibleColumns,
    countryCounts,
    onCallHistoryOpen,
    onExportVCardOpen,
    onFindEmails,
    onOpenDuplicateFinder,
    onOpenFranchiseFinder,
  } = props;

  return (
    <>
      <ClientDashboardTopControls
        allStatesCount={allStates.length}
        colorPresets={colorPresets}
        colorRowByStatus={colorRowByStatus}
        currentColors={currentColors}
        currentUser={currentUser}
        customColors={customColors}
        deleteColorPreset={deleteColorPreset}
        fontSize={fontSize}
        freezeFirstColumn={freezeFirstColumn}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        rowHeight={rowHeight}
        saveAllStatusColors={saveAllStatusColors}
        searchTerm={searchTerm}
        selectedStatesCount={selectedStates.size}
        setColorPresets={setColorPresets}
        setColorRowByStatus={setColorRowByStatus}
        showMyStoresOnly={showMyStoresOnly}
        showUnclaimedOnly={showUnclaimedOnly}
        statusColors={statusColors}
        statusOptions={statusOptions}
        textAlign={textAlign}
        verticalAlign={verticalAlign}
        onFontSizeChange={setFontSize}
        onFreezeFirstColumnChange={setFreezeFirstColumn}
        onRefresh={handleManualRefresh}
        onResetAlignment={() => {
          setTextAlign("left");
          setVerticalAlign("middle");
          toast({
            title: "Alignment Reset",
            description: "Text and vertical alignment reset to defaults",
          });
        }}
        onResetColumns={() => {
          const hiddenColumns = ["title", "error"];
          const newVisibleColumns: Record<string, boolean> = {};
          headers.forEach((header: string) => {
            newVisibleColumns[header] = !hiddenColumns.includes(header.toLowerCase());
          });
          setVisibleColumns(newVisibleColumns);
          setColumnOrder(headers);
          toast({
            title: "Columns Reset",
            description: "All columns are now visible in their original order",
          });
        }}
        onResetDisplay={() => {
          setFontSize(14);
          setRowHeight(48);
          toast({
            title: "Display Reset",
            description: "Font size and row height reset to defaults",
          });
        }}
        onResetFilters={() => {
          setSelectedStates(new Set(allStates));
          setSearchTerm("");
          toast({
            title: "Filters Reset",
            description: "All filters cleared and search reset",
          });
        }}
        onRowHeightChange={setRowHeight}
        onSearchTermChange={setSearchTerm}
        onTextAlignChange={setTextAlign}
        onToggleMyStoresOnly={(checked) => {
          if (checked) setShowUnclaimedOnly(false);
          setShowMyStoresOnly(checked);
        }}
        onToggleUnclaimedOnly={(checked) => {
          if (checked) setShowMyStoresOnly(false);
          setShowUnclaimedOnly(checked);
        }}
        onVerticalAlignChange={setVerticalAlign}
      />

      <ClientDashboardFiltersRow
        allCountries={allCountries}
        allStates={allStates}
        cityCounts={cityCounts}
        citiesInSelectedStates={citiesInSelectedStates}
        citySearchTerm={citySearchTerm}
        columnOrder={columnOrder}
        countryCounts={countryCounts}
        currentColors={currentColors}
        dataCount={data.length}
        editableColumns={editableColumns}
        filteredCount={filteredData.length}
        isAdmin={isAdmin}
        isEmailCrawling={isEmailCrawling}
        selectedCities={selectedCities}
        selectedCountries={selectedCountries}
        selectedFranchise={selectedFranchise}
        selectedStates={selectedStates}
        selectedStatuses={selectedStatuses}
        showCanadaOnly={showCanadaOnly}
        showStateless={showStateless}
        stateCounts={stateCounts}
        statelessCount={statelessCount}
        statusOptions={statusOptions}
        visibleColumns={visibleColumns}
        onAutoFitColumns={autoFitColumns}
        onCallHistory={onCallHistoryOpen}
        onCitySearchTermChange={setCitySearchTerm}
        onClearAllCities={() => setSelectedCities(new Set())}
        onClearAllCountries={() => setSelectedCountries(new Set())}
        onClearAllStates={clearAllStates}
        onClearAllStatuses={() => setSelectedStatuses(new Set())}
        onClearFranchise={() => setSelectedFranchise(null)}
        onExportVCard={onExportVCardOpen}
        onFindEmails={onFindEmails}
        onMoveColumnLeft={moveColumnLeft}
        onMoveColumnRight={moveColumnRight}
        onOpenDuplicateFinder={onOpenDuplicateFinder}
        onOpenFranchiseFinder={onOpenFranchiseFinder}
        onResetColumns={() => {
          const hiddenColumns = ["title", "error"];
          const newVisibleColumns: Record<string, boolean> = {};
          headers.forEach((header: string) => {
            newVisibleColumns[header] = !hiddenColumns.includes(header.toLowerCase());
          });
          setVisibleColumns(newVisibleColumns);
          setColumnOrder(headers);
          toast({
            title: "Columns Reset",
            description: "All columns are now visible in their original order",
          });
        }}
        onSelectAllCities={() => setSelectedCities(new Set(citiesInSelectedStates))}
        onSelectAllCountries={() => setSelectedCountries(new Set(allCountries))}
        onSelectAllStates={selectAllStates}
        onSelectAllStatuses={() => setSelectedStatuses(new Set(statusOptions))}
        onShowCanadaOnlyChange={setShowCanadaOnly}
        onShowStatelessChange={setShowStateless}
        onToggleCity={(city) => {
          const newSelected = new Set(selectedCities);
          if (newSelected.has(city)) newSelected.delete(city);
          else newSelected.add(city);
          setSelectedCities(newSelected);
        }}
        onToggleColumn={toggleColumn}
        onToggleCountry={(country) => {
          const newSelected = new Set(selectedCountries);
          if (newSelected.has(country)) newSelected.delete(country);
          else newSelected.add(country);
          setSelectedCountries(newSelected);
        }}
        onToggleState={toggleState}
        onToggleStatus={(status) => {
          const newSelected = new Set(selectedStatuses);
          if (newSelected.has(status)) newSelected.delete(status);
          else newSelected.add(status);
          setSelectedStatuses(newSelected);
        }}
      />
    </>
  );
}
