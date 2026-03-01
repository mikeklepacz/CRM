import { useMemo } from "react";
import { useSearch } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { useOptionalProject } from "@/contexts/project-context";
import { useCustomTheme } from "@/hooks/use-custom-theme";
import { BASE_COUNTRIES } from "@/components/map-search/map-search.constants";
import { MapSearchPageView } from "@/components/map-search/map-search-page-view";
import {
  getBusinessLink,
  getCountryOptions,
  getDuplicatesInResultsCount,
  getFilteredResults,
  getHiddenByKeywordFilters,
  getSortedExclusionValues,
  parseCityState,
} from "@/components/map-search/map-search-utils";
import { useMapSearchEffects } from "@/components/map-search/use-map-search-effects";
import { useMapSearchHandlers } from "@/components/map-search/use-map-search-handlers";
import { useMapSearchMutations } from "@/components/map-search/use-map-search-mutations";
import { useMapSearchPreferences } from "@/components/map-search/use-map-search-preferences";
import { useMapSearchQueries } from "@/components/map-search/use-map-search-queries";
import { useMapSearchState } from "@/components/map-search/use-map-search-state";

export default function MapSearch() {
  const { toast } = useToast();
  const { actualTheme } = useTheme();
  const searchString = useSearch();
  const projectContext = useOptionalProject();
  const currentProject = projectContext?.currentProject;
  const mapSearchState = useMapSearchState();
  const { currentColors, statusColors, statusOptions } = useCustomTheme();
  const joinColumn = "link";
  const isProjectContextLoading = projectContext?.isLoading ?? false;

  const isQualificationModeFromUrl = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return params.get("mode") === "qualification";
  }, [searchString]);

  const queries = useMapSearchQueries({
    currentProjectId: currentProject?.id,
    isProjectContextLoading,
    isQualificationModeFromUrl,
  });

  const isQualificationMode = queries.useSqlMode;

  const mutations = useMapSearchMutations({
    ...mapSearchState,
    currentProjectId: currentProject?.id,
    exclusionsUrl: queries.exclusionsUrl,
    isQualificationMode,
    toast,
  });

  useMapSearchEffects({
    ...mapSearchState,
    ...queries,
    currentProjectName: currentProject?.name,
    loadMoreMutation: mutations.loadMoreMutation,
    mapSessionKey: mapSearchState.MAP_SESSION_KEY,
  });

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (mapSearchState.showBusinessesMode) return;
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      mapSearchState.setSelectedLocation({ lat, lng });
      mapSearchState.setMapCenter({ lat, lng });
      mapSearchState.setMapZoom(12);
      mutations.reverseGeocodeMutation.mutate({ lat, lng });
    }
  };

  const keywords = getSortedExclusionValues(queries.exclusionsData?.exclusions, "keyword");
  const placeTypes = getSortedExclusionValues(queries.exclusionsData?.exclusions, "place_type");

  const filteredResults = getFilteredResults({
    activeKeywords: mapSearchState.activeKeywords,
    duplicateWebsites: mapSearchState.duplicateWebsites,
    hideClosedBusinesses: mapSearchState.hideClosedBusinesses,
    hideDuplicates: mapSearchState.hideDuplicates,
    searchResults: mapSearchState.searchResults,
  });

  const duplicatesInResults = getDuplicatesInResultsCount(
    mapSearchState.searchResults,
    mapSearchState.duplicateWebsites,
  );

  const showCheckboxes = mapSearchState.searchResults.length >= 2;
  const allSelected =
    filteredResults.length > 0 && filteredResults.every((place) => mapSearchState.selectedPlaces.has(place.place_id));

  const hiddenByKeywordFilters = getHiddenByKeywordFilters({
    duplicatesInResults,
    filteredResults,
    hideClosedBusinesses: mapSearchState.hideClosedBusinesses,
    hideDuplicates: mapSearchState.hideDuplicates,
    searchResults: mapSearchState.searchResults,
  });

  const countryOptions = getCountryOptions(mapSearchState.country, BASE_COUNTRIES);
  const isDefaultCountryChecked = queries.preferencesData?.defaultMapCountry === mapSearchState.country;

  const isDefaultViewChecked =
    queries.preferencesData?.defaultMapView?.lat === mapSearchState.mapCenter.lat &&
    queries.preferencesData?.defaultMapView?.lng === mapSearchState.mapCenter.lng &&
    queries.preferencesData?.defaultMapView?.zoom === mapSearchState.mapZoom;

  const { handleToggleDefaultCountry, handleToggleDefaultView } = useMapSearchPreferences({
    country: mapSearchState.country,
    mapCenter: mapSearchState.mapCenter,
    mapZoom: mapSearchState.mapZoom,
    toast,
  });

  const handlers = useMapSearchHandlers({
    ...mapSearchState,
    ...mutations,
    currentProjectId: currentProject?.id,
    filteredResults,
    isQualificationMode,
    toast,
  });

  return (
    <MapSearchPageView
      actualTheme={actualTheme}
      currentColors={currentColors}
      currentProject={currentProject}
      currentProjectId={currentProject?.id}
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""}
      handlers={handlers}
      isDefaultCountryChecked={isDefaultCountryChecked}
      isDefaultViewChecked={isDefaultViewChecked}
      isQualificationMode={isQualificationMode}
      joinColumn={joinColumn}
      keywords={keywords}
      mapSearchState={mapSearchState}
      mutations={mutations}
      onMapClick={handleMapClick}
      onToggleDefaultCountry={handleToggleDefaultCountry}
      onToggleDefaultView={handleToggleDefaultView}
      parseCityState={parseCityState}
      getBusinessLink={getBusinessLink}
      placeTypes={placeTypes}
      queries={queries}
      statusColors={statusColors}
      statusOptions={statusOptions}
      derived={{
        allSelected,
        countryOptions,
        duplicatesInResults,
        filteredResults,
        hiddenByKeywordFilters,
        showCheckboxes,
      }}
    />
  );
}
