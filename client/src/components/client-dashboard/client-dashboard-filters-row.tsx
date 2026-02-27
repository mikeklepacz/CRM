import { CitiesFilterPopover } from "@/components/client-dashboard/cities-filter-popover";
import { ColumnSettingsPopover } from "@/components/client-dashboard/column-settings-popover";
import { CountriesFilterPopover } from "@/components/client-dashboard/countries-filter-popover";
import { DashboardActionButtons } from "@/components/client-dashboard/dashboard-action-buttons";
import { FranchiseControls } from "@/components/client-dashboard/franchise-controls";
import { StatesFilterPopover } from "@/components/client-dashboard/states-filter-popover";
import { StatusFilterPopover } from "@/components/client-dashboard/status-filter-popover";

type ClientDashboardFiltersRowProps = {
  allCountries: string[];
  allStates: string[];
  cityCounts: Record<string, number>;
  citiesInSelectedStates: string[];
  citySearchTerm: string;
  columnOrder: string[];
  countryCounts: Record<string, number>;
  currentColors: any;
  dataCount: number;
  editableColumns: string[];
  filteredCount: number;
  isAdmin: boolean;
  isEmailCrawling: boolean;
  selectedCities: Set<string>;
  selectedCountries: Set<string>;
  selectedFranchise: any;
  selectedStates: Set<string>;
  selectedStatuses: Set<string>;
  showCanadaOnly: boolean;
  showStateless: boolean;
  stateCounts: Record<string, number>;
  statelessCount: number;
  statusOptions: string[];
  visibleColumns: Record<string, boolean>;
  onAutoFitColumns: () => void;
  onCallHistory: () => void;
  onCitySearchTermChange: (value: string) => void;
  onClearAllCities: () => void;
  onClearAllCountries: () => void;
  onClearAllStates: () => void;
  onClearAllStatuses: () => void;
  onClearFranchise: () => void;
  onExportVCard: () => void;
  onFindEmails: () => void;
  onMoveColumnLeft: (column: string) => void;
  onMoveColumnRight: (column: string) => void;
  onOpenDuplicateFinder: () => void;
  onOpenFranchiseFinder: () => void;
  onResetColumns: () => void;
  onSelectAllCities: () => void;
  onSelectAllCountries: () => void;
  onSelectAllStates: () => void;
  onSelectAllStatuses: () => void;
  onShowCanadaOnlyChange: (value: boolean) => void;
  onShowStatelessChange: (value: boolean) => void;
  onToggleCity: (city: string) => void;
  onToggleColumn: (column: string) => void;
  onToggleCountry: (country: string) => void;
  onToggleState: (state: string) => void;
  onToggleStatus: (status: string) => void;
};

export function ClientDashboardFiltersRow({
  allCountries,
  allStates,
  cityCounts,
  citiesInSelectedStates,
  citySearchTerm,
  columnOrder,
  countryCounts,
  currentColors,
  dataCount,
  editableColumns,
  filteredCount,
  isAdmin,
  isEmailCrawling,
  selectedCities,
  selectedCountries,
  selectedFranchise,
  selectedStates,
  selectedStatuses,
  showCanadaOnly,
  showStateless,
  stateCounts,
  statelessCount,
  statusOptions,
  visibleColumns,
  onAutoFitColumns,
  onCallHistory,
  onCitySearchTermChange,
  onClearAllCities,
  onClearAllCountries,
  onClearAllStates,
  onClearAllStatuses,
  onClearFranchise,
  onExportVCard,
  onFindEmails,
  onMoveColumnLeft,
  onMoveColumnRight,
  onOpenDuplicateFinder,
  onOpenFranchiseFinder,
  onResetColumns,
  onSelectAllCities,
  onSelectAllCountries,
  onSelectAllStates,
  onSelectAllStatuses,
  onShowCanadaOnlyChange,
  onShowStatelessChange,
  onToggleCity,
  onToggleColumn,
  onToggleCountry,
  onToggleState,
  onToggleStatus,
}: ClientDashboardFiltersRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-1 bg-muted rounded-md" data-testid="text-shops-counter">
        <span className="font-medium">Showing {filteredCount} of {dataCount} shops</span>
      </div>

      <StatesFilterPopover
        allStates={allStates}
        clearAllStates={onClearAllStates}
        selectAllStates={onSelectAllStates}
        selectedStates={selectedStates}
        setShowCanadaOnly={onShowCanadaOnlyChange}
        setShowStateless={onShowStatelessChange}
        showCanadaOnly={showCanadaOnly}
        showStateless={showStateless}
        stateCounts={stateCounts}
        statesButtonColor={currentColors.statesButton}
        statelessCount={statelessCount}
        toggleState={onToggleState}
      />

      {selectedStates.size > 0 && citiesInSelectedStates.length > 0 && (
        <CitiesFilterPopover
          citiesInSelectedStates={citiesInSelectedStates}
          cityCounts={cityCounts}
          citySearchTerm={citySearchTerm}
          onCitySearchTermChange={onCitySearchTermChange}
          onClearAllCities={onClearAllCities}
          onSelectAllCities={onSelectAllCities}
          onToggleCity={onToggleCity}
          selectedCities={selectedCities}
        />
      )}

      {allCountries.length > 0 && (
        <CountriesFilterPopover
          allCountries={allCountries}
          countryCounts={countryCounts}
          onClearAllCountries={onClearAllCountries}
          onSelectAllCountries={onSelectAllCountries}
          onToggleCountry={onToggleCountry}
          selectedCountries={selectedCountries}
        />
      )}

      <FranchiseControls
        selectedFranchise={selectedFranchise}
        isAdmin={isAdmin}
        franchiseButtonColor={currentColors.franchiseButton}
        onOpenFranchiseFinder={onOpenFranchiseFinder}
        onClearFranchise={onClearFranchise}
        onOpenDuplicateFinder={onOpenDuplicateFinder}
      />

      <StatusFilterPopover
        onClearAllStatuses={onClearAllStatuses}
        onSelectAllStatuses={onSelectAllStatuses}
        onToggleStatus={onToggleStatus}
        selectedStatuses={selectedStatuses}
        statusButtonColor={currentColors.statusButton}
        statusOptions={statusOptions}
      />

      <ColumnSettingsPopover
        autoFitColumns={onAutoFitColumns}
        columnOrder={columnOrder}
        columnsButtonColor={currentColors.columnsButton}
        editableColumns={editableColumns}
        moveColumnLeft={onMoveColumnLeft}
        moveColumnRight={onMoveColumnRight}
        onResetColumns={onResetColumns}
        toggleColumn={onToggleColumn}
        visibleColumns={visibleColumns}
      />

      <DashboardActionButtons
        actionButtonColor={currentColors.actionButtons}
        isEmailCrawling={isEmailCrawling}
        onCallHistory={onCallHistory}
        onFindEmails={onFindEmails}
        onExportVCard={onExportVCard}
      />
    </div>
  );
}
