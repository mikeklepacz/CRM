import { useEffect } from "react";
import type { RefObject } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { GoogleSheet } from "@/components/map-search/map-search.types";

interface UseMapSearchEffectsProps {
  activeKeywords: string[];
  activeTypes: string[];
  categoryLoaded: boolean;
  currentProjectName?: string;
  defaultCountryLoaded: boolean;
  lastCategoryData?: { category: string };
  loadMoreMutation: { mutate: () => void };
  loadingMore: boolean;
  mapSessionKey: string;
  mapViewLoaded: boolean;
  nextPageToken: string | null;
  preferencesData?: {
    activeExcludedKeywords?: string[];
    activeExcludedTypes?: string[];
    defaultMapCountry?: string | null;
    defaultMapView?: { lat: number; lng: number; zoom: number } | null;
  };
  resultsContainerRef: RefObject<HTMLDivElement>;
  setActiveKeywords: (value: string[]) => void;
  setActiveTypes: (value: string[]) => void;
  setCategory: (value: string) => void;
  setCategoryLoaded: (value: boolean) => void;
  setCountry: (value: string) => void;
  setCustomCategory: (value: string) => void;
  setDefaultCountryLoaded: (value: boolean) => void;
  setMapCenter: (value: { lat: number; lng: number }) => void;
  setMapViewLoaded: (value: boolean) => void;
  setMapZoom: (value: number) => void;
  setStoreSheetId: (value: string) => void;
  setTrackerSheetId: (value: string) => void;
  sheetsData?: { sheets: GoogleSheet[] };
}

export function useMapSearchEffects(props: UseMapSearchEffectsProps) {
  useEffect(() => {
    if (props.currentProjectName) {
      props.setCategory(props.currentProjectName);
      props.setCustomCategory(props.currentProjectName);
      props.setCategoryLoaded(true);
    }
  }, [props.currentProjectName, props.setCategory, props.setCategoryLoaded, props.setCustomCategory]);

  useEffect(() => {
    if (props.sheetsData?.sheets) {
      const storeSheet = props.sheetsData.sheets.find((s) => s.sheetPurpose === "Store Database");
      const trackerSheet = props.sheetsData.sheets.find((s) => s.sheetPurpose === "commissions");
      if (storeSheet) props.setStoreSheetId(storeSheet.id);
      if (trackerSheet) props.setTrackerSheetId(trackerSheet.id);
    }
  }, [props.sheetsData, props.setStoreSheetId, props.setTrackerSheetId]);

  useEffect(() => {
    if (!props.categoryLoaded && props.lastCategoryData !== undefined && !props.currentProjectName) {
      const savedCategory = props.lastCategoryData?.category || "";
      props.setCategory(savedCategory);
      props.setCustomCategory(savedCategory);
      props.setCategoryLoaded(true);
    }
  }, [props.categoryLoaded, props.currentProjectName, props.lastCategoryData, props.setCategory, props.setCategoryLoaded, props.setCustomCategory]);

  useEffect(() => {
    if (props.preferencesData) {
      props.setActiveKeywords(props.preferencesData.activeExcludedKeywords || []);
      props.setActiveTypes(props.preferencesData.activeExcludedTypes || []);
    }
  }, [props.preferencesData, props.setActiveKeywords, props.setActiveTypes]);

  useEffect(() => {
    if (!props.defaultCountryLoaded && props.preferencesData !== undefined) {
      if (props.preferencesData?.defaultMapCountry) {
        props.setCountry(props.preferencesData.defaultMapCountry);
      }
      props.setDefaultCountryLoaded(true);
    }
  }, [props.defaultCountryLoaded, props.preferencesData, props.setCountry, props.setDefaultCountryLoaded]);

  useEffect(() => {
    if (!props.mapViewLoaded && props.preferencesData !== undefined) {
      const sessionView = sessionStorage.getItem(props.mapSessionKey);
      if (sessionView) {
        try {
          const parsed = JSON.parse(sessionView);
          if (
            typeof parsed.lat === "number" &&
            Number.isFinite(parsed.lat) &&
            typeof parsed.lng === "number" &&
            Number.isFinite(parsed.lng) &&
            typeof parsed.zoom === "number" &&
            Number.isFinite(parsed.zoom)
          ) {
            props.setMapCenter({ lat: parsed.lat, lng: parsed.lng });
            props.setMapZoom(parsed.zoom);
            props.setMapViewLoaded(true);
            return;
          }
        } catch {
          // Ignore parse errors
        }
      }

      if (props.preferencesData?.defaultMapView) {
        props.setMapCenter({
          lat: props.preferencesData.defaultMapView.lat,
          lng: props.preferencesData.defaultMapView.lng,
        });
        props.setMapZoom(props.preferencesData.defaultMapView.zoom);
        props.setMapViewLoaded(true);
        return;
      }

      if (navigator.geolocation) {
        let geoHandled = false;
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (geoHandled) return;
            geoHandled = true;
            const { latitude, longitude } = position.coords;
            props.setMapCenter({ lat: latitude, lng: longitude });
            props.setMapZoom(10);
            sessionStorage.setItem(
              props.mapSessionKey,
              JSON.stringify({
                lat: latitude,
                lng: longitude,
                zoom: 10,
              }),
            );
            props.setMapViewLoaded(true);
          },
          () => {
            if (geoHandled) return;
            geoHandled = true;
            props.setMapViewLoaded(true);
          },
          { timeout: 5000, maximumAge: 300000 },
        );
      } else {
        props.setMapViewLoaded(true);
      }
    }
  }, [props.mapSessionKey, props.mapViewLoaded, props.preferencesData, props.setMapCenter, props.setMapViewLoaded, props.setMapZoom]);

  useEffect(() => {
    const saveActiveExclusions = async () => {
      try {
        await apiRequest("PUT", "/api/user/active-exclusions", {
          activeKeywords: props.activeKeywords,
          activeTypes: props.activeTypes,
        });
      } catch (error) {
        console.error("Failed to save active exclusions:", error);
      }
    };

    if (props.preferencesData) {
      saveActiveExclusions();
    }
  }, [props.activeKeywords, props.activeTypes, props.preferencesData]);

  useEffect(() => {
    const container = props.resultsContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      if (distanceFromBottom < 200 && props.nextPageToken && !props.loadingMore) {
        props.loadMoreMutation.mutate();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [props.loadMoreMutation, props.loadingMore, props.nextPageToken, props.resultsContainerRef]);
}
