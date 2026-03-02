import { queryClient } from "@/lib/queryClient";
import { StoreDetailsDialog } from "@/components/store-details-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { MapSearchControlCard } from "@/components/map-search/map-search-control-card";
import { MapSearchMapCanvas } from "@/components/map-search/map-search-map-canvas";
import { MapSearchResultsPanel } from "@/components/map-search/map-search-results-panel";

interface MapSearchPageViewProps {
  actualTheme: string;
  currentColors: any;
  currentProject: any;
  currentProjectId?: string;
  googleMapsApiKey: string;
  handlers: any;
  isDefaultCountryChecked: boolean;
  isDefaultViewChecked: boolean;
  isQualificationMode: boolean;
  joinColumn: string;
  keywords: string[];
  mapSearchState: any;
  mutations: any;
  placeTypes: string[];
  queries: any;
  statusColors: any;
  statusOptions: any;
  derived: {
    allSelected: boolean;
    countryOptions: string[];
    duplicatesInResults: number;
    filteredResults: any[];
    hiddenByKeywordFilters: number;
    showCheckboxes: boolean;
  };
  onMapClick: (e: google.maps.MapMouseEvent) => void;
  onToggleDefaultCountry: (checked: boolean) => Promise<void>;
  onToggleDefaultView: (checked: boolean) => Promise<void>;
  parseCityState: (address: string) => { city: string; state: string };
  getBusinessLink: (place: any) => string;
}

export function MapSearchPageView(props: MapSearchPageViewProps) {
  return (
    <div className="relative w-full h-[90vh] overflow-hidden" data-testid="map-container">
      <MapSearchMapCanvas
        actualTheme={props.actualTheme}
        city={props.mapSearchState.city}
        country={props.mapSearchState.country}
        currentProjectId={props.currentProjectId}
        filteredResults={props.derived.filteredResults}
        googleMapsApiKey={props.googleMapsApiKey}
        handleMapClick={props.onMapClick}
        hoveredSearchPin={props.mapSearchState.hoveredSearchPin}
        joinColumn={props.joinColumn}
        mapCenter={props.mapSearchState.mapCenter}
        mapRef={props.mapSearchState.mapRef}
        mapSessionKey={props.mapSearchState.MAP_SESSION_KEY}
        mapViewLoaded={props.mapSearchState.mapViewLoaded}
        mapZoom={props.mapSearchState.mapZoom}
        onStorePinClick={(row) => {
          props.mapSearchState.setStoreDetailsDialog({ open: true, row });
        }}
        searchResults={props.mapSearchState.searchResults}
        selectedLocation={props.mapSearchState.selectedLocation}
        setHoveredSearchPin={props.mapSearchState.setHoveredSearchPin}
        setMapCenter={props.mapSearchState.setMapCenter}
        setMapZoom={props.mapSearchState.setMapZoom}
        showBusinessesMode={props.mapSearchState.showBusinessesMode}
        state={props.mapSearchState.state}
        statusColors={props.statusColors}
        storeSheetId={props.mapSearchState.storeSheetId}
        trackerSheetId={props.mapSearchState.trackerSheetId}
      />

      <MapSearchControlCard
        activeKeywords={props.mapSearchState.activeKeywords}
        activeTypes={props.mapSearchState.activeTypes}
        addExclusionMutation={props.mutations.addExclusionMutation}
        businessType={props.mapSearchState.businessType}
        businessTypeOpen={props.mapSearchState.businessTypeOpen}
        categoriesData={props.queries.categoriesData}
        category={props.mapSearchState.category}
        categoryOpen={props.mapSearchState.categoryOpen}
        city={props.mapSearchState.city}
        clearAllKeywords={props.handlers.clearAllKeywords}
        clearAllTypes={props.handlers.clearAllTypes}
        country={props.mapSearchState.country}
        countryOptions={props.derived.countryOptions}
        currentProject={props.currentProject}
        customCategory={props.mapSearchState.customCategory}
        filtersOpen={props.mapSearchState.filtersOpen}
        handleSearch={props.handlers.handleSearch}
        handleToggleDefaultCountry={props.onToggleDefaultCountry}
        handleToggleDefaultView={props.onToggleDefaultView}
        hasStoreDatabase={props.queries.hasStoreDatabase}
        isDefaultCountryChecked={props.isDefaultCountryChecked}
        isDefaultViewChecked={props.isDefaultViewChecked}
        isQualificationMode={props.isQualificationMode}
        keywords={props.keywords}
        newKeyword={props.mapSearchState.newKeyword}
        newPlaceType={props.mapSearchState.newPlaceType}
        placeTypes={props.placeTypes}
        searchHistoryData={props.queries.searchHistoryData}
        searchMutation={props.mutations.searchMutation}
        setBusinessType={props.mapSearchState.setBusinessType}
        setBusinessTypeOpen={props.mapSearchState.setBusinessTypeOpen}
        setCategory={props.mapSearchState.setCategory}
        setCategoryOpen={props.mapSearchState.setCategoryOpen}
        setCity={props.mapSearchState.setCity}
        setCountry={props.mapSearchState.setCountry}
        setCustomCategory={props.mapSearchState.setCustomCategory}
        setFiltersOpen={props.mapSearchState.setFiltersOpen}
        setNewKeyword={props.mapSearchState.setNewKeyword}
        setNewPlaceType={props.mapSearchState.setNewPlaceType}
        setShowBusinessesMode={props.mapSearchState.setShowBusinessesMode}
        setState={props.mapSearchState.setState}
        setStateOpen={props.mapSearchState.setStateOpen}
        sheetsLoading={props.queries.sheetsLoading}
        showBusinessesMode={props.mapSearchState.showBusinessesMode}
        state={props.mapSearchState.state}
        stateOpen={props.mapSearchState.stateOpen}
        storeSheetId={props.mapSearchState.storeSheetId}
        toggleKeyword={props.handlers.toggleKeyword}
        togglePlaceType={props.handlers.togglePlaceType}
        trackerSheetId={props.mapSearchState.trackerSheetId}
      />

      {!props.mapSearchState.showBusinessesMode && props.mapSearchState.searchResults.length > 0 && (
        <MapSearchResultsPanel
          allSelected={props.derived.allSelected}
          checkingDuplicates={props.mapSearchState.checkingDuplicates}
          duplicateCount={props.mapSearchState.duplicateCount}
          duplicatesInResults={props.derived.duplicatesInResults}
          exportProgress={props.mapSearchState.exportProgress}
          filteredResults={props.derived.filteredResults}
          getBusinessLink={props.getBusinessLink}
          gridSearchInfo={props.mapSearchState.gridSearchInfo}
          handleExportSelected={props.handlers.handleExportSelected}
          handleSavePlace={props.handlers.handleSavePlace}
          hiddenByKeywordFilters={props.derived.hiddenByKeywordFilters}
          hideClosedBusinesses={props.mapSearchState.hideClosedBusinesses}
          hideDuplicates={props.mapSearchState.hideDuplicates}
          isQualificationMode={props.isQualificationMode}
          loadingMore={props.mapSearchState.loadingMore}
          parseCityState={props.parseCityState}
          resultsContainerRef={props.mapSearchState.resultsContainerRef}
          saveToQualificationMutation={props.mutations.saveToQualificationMutation}
          saveToSheetMutation={props.mutations.saveToSheetMutation}
          searchResults={props.mapSearchState.searchResults}
          selectedPlaces={props.mapSearchState.selectedPlaces}
          setHideClosedBusinesses={props.mapSearchState.setHideClosedBusinesses}
          setHideDuplicates={props.mapSearchState.setHideDuplicates}
          sheetsLoading={props.queries.sheetsLoading}
          showCheckboxes={props.derived.showCheckboxes}
          togglePlaceSelection={props.handlers.togglePlaceSelection}
          toggleSelectAll={props.handlers.toggleSelectAll}
        />
      )}

      {!props.mapSearchState.showBusinessesMode &&
        props.mutations.searchMutation.isSuccess &&
        props.mapSearchState.searchResults.length === 0 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <Card className="backdrop-blur-md bg-background/80">
              <CardContent className="py-12 px-8 text-center">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-muted-foreground">Try adjusting your search terms or location</p>
              </CardContent>
            </Card>
          </div>
        )}

      {props.mapSearchState.storeDetailsDialog && (
        <StoreDetailsDialog
          open={props.mapSearchState.storeDetailsDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              props.mapSearchState.setStoreDetailsDialog(null);
              props.mapSearchState.setLoadDefaultScriptTrigger(0);
            }
          }}
          row={props.mapSearchState.storeDetailsDialog.row}
          trackerSheetId={props.mapSearchState.trackerSheetId}
          storeSheetId={props.mapSearchState.storeSheetId}
          refetch={async () => {
            queryClient.invalidateQueries({ queryKey: ["/api/maps/client-pins"] });
          }}
          currentColors={props.currentColors}
          statusOptions={props.statusOptions}
          statusColors={props.statusColors}
          contextUpdateTrigger={props.mapSearchState.contextUpdateTrigger}
          setContextUpdateTrigger={props.mapSearchState.setContextUpdateTrigger}
          loadDefaultScriptTrigger={props.mapSearchState.loadDefaultScriptTrigger}
        />
      )}
    </div>
  );
}
