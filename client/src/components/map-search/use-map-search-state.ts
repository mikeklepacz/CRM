import { useRef, useState } from "react";
import type { LastSearchParams, PlaceResult } from "@/components/map-search/map-search.types";

export function useMapSearchState() {
  const [businessType, setBusinessType] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("United States");
  const [defaultCountryLoaded, setDefaultCountryLoaded] = useState(false);
  const [categoryLoaded, setCategoryLoaded] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [businessTypeOpen, setBusinessTypeOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [hideClosedBusinesses, setHideClosedBusinesses] = useState(true);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [duplicateWebsites, setDuplicateWebsites] = useState<Set<string>>(new Set());
  const [hideDuplicates, setHideDuplicates] = useState(true);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 39.8283, lng: -98.5795 });
  const [mapZoom, setMapZoom] = useState(4);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hoveredSearchPin, setHoveredSearchPin] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapViewLoaded, setMapViewLoaded] = useState(false);
  const MAP_SESSION_KEY = "mapSearchViewState";
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  const [lastSearchParams, setLastSearchParams] = useState<LastSearchParams | null>(null);
  const [gridSearchInfo, setGridSearchInfo] = useState<{
    totalZones: number;
    gridDuplicatesRemoved: number;
  } | null>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newPlaceType, setNewPlaceType] = useState("");
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [exportProgress, setExportProgress] = useState<{
    current: number;
    total: number;
    failed: number;
  } | null>(null);
  const [showBusinessesMode, setShowBusinessesMode] = useState(false);
  const [storeSheetId, setStoreSheetId] = useState<string>("");
  const [trackerSheetId, setTrackerSheetId] = useState<string>("");
  const [contextUpdateTrigger, setContextUpdateTrigger] = useState(0);
  const [loadDefaultScriptTrigger, setLoadDefaultScriptTrigger] = useState(0);
  const [storeDetailsDialog, setStoreDetailsDialog] = useState<{
    open: boolean;
    row: any;
  } | null>(null);

  return {
    MAP_SESSION_KEY,
    activeKeywords,
    activeTypes,
    businessType,
    businessTypeOpen,
    category,
    categoryLoaded,
    categoryOpen,
    checkingDuplicates,
    city,
    contextUpdateTrigger,
    country,
    defaultCountryLoaded,
    duplicateCount,
    duplicateWebsites,
    exportProgress,
    filtersOpen,
    gridSearchInfo,
    hideClosedBusinesses,
    hideDuplicates,
    hoveredSearchPin,
    lastSearchParams,
    loadDefaultScriptTrigger,
    loadingMore,
    mapCenter,
    mapRef,
    mapViewLoaded,
    mapZoom,
    newKeyword,
    newPlaceType,
    nextPageToken,
    resultsContainerRef,
    searchResults,
    selectedLocation,
    selectedPlaces,
    setActiveKeywords,
    setActiveTypes,
    setBusinessType,
    setBusinessTypeOpen,
    setCategory,
    setCategoryLoaded,
    setCategoryOpen,
    setCheckingDuplicates,
    setCity,
    setContextUpdateTrigger,
    setCountry,
    setDefaultCountryLoaded,
    setDuplicateCount,
    setDuplicateWebsites,
    setExportProgress,
    setFiltersOpen,
    setGridSearchInfo,
    setHideClosedBusinesses,
    setHideDuplicates,
    setHoveredSearchPin,
    setLastSearchParams,
    setLoadDefaultScriptTrigger,
    setLoadingMore,
    setMapCenter,
    setMapViewLoaded,
    setMapZoom,
    setNewKeyword,
    setNewPlaceType,
    setNextPageToken,
    setSearchResults,
    setSelectedLocation,
    setSelectedPlaces,
    setShowBusinessesMode,
    setState,
    setStateOpen,
    setStoreDetailsDialog,
    setStoreSheetId,
    setTrackerSheetId,
    showBusinessesMode,
    state,
    stateOpen,
    storeDetailsDialog,
    storeSheetId,
    trackerSheetId,
    customCategory,
    setCustomCategory,
  };
}
