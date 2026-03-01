import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Category, GoogleSheet, SavedExclusion, SearchHistory } from "@/components/map-search/map-search.types";

interface UseMapSearchQueriesProps {
  currentProjectId?: string;
  isProjectContextLoading: boolean;
  isQualificationModeFromUrl: boolean;
}

export function useMapSearchQueries(props: UseMapSearchQueriesProps) {
  const { data: sheetsData, isLoading: sheetsLoading } = useQuery<{ sheets: GoogleSheet[] }>({
    queryKey: ["/api/sheets"],
  });

  const hasStoreDatabase = useMemo(() => {
    if (!sheetsData?.sheets) return false;
    return sheetsData.sheets.some((s) => s.sheetPurpose === "Store Database");
  }, [sheetsData]);

  const useSqlMode = useMemo(() => {
    if (props.isQualificationModeFromUrl) return true;
    if (sheetsLoading) return true;
    return !hasStoreDatabase;
  }, [props.isQualificationModeFromUrl, sheetsLoading, hasStoreDatabase]);

  const categoriesUrl = props.currentProjectId ? `/api/categories/active?projectId=${props.currentProjectId}` : "/api/categories/active";
  const { data: categoriesData } = useQuery<{ categories: Category[] }>({
    queryKey: [categoriesUrl],
    enabled: !props.isProjectContextLoading,
  });

  const exclusionsUrl = props.currentProjectId ? `/api/exclusions?projectId=${props.currentProjectId}` : "/api/exclusions";
  const { data: exclusionsData } = useQuery<{ exclusions: SavedExclusion[] }>({
    queryKey: [exclusionsUrl],
    enabled: !props.isProjectContextLoading,
  });

  const { data: preferencesData } = useQuery<{
    activeExcludedKeywords?: string[];
    activeExcludedTypes?: string[];
    defaultMapCountry?: string | null;
    defaultMapView?: { lat: number; lng: number; zoom: number } | null;
  }>({
    queryKey: ["/api/user/preferences"],
  });

  const { data: searchHistoryData } = useQuery<{ history: SearchHistory[] }>({
    queryKey: ["/api/maps/search-history"],
  });

  const { data: lastCategoryData } = useQuery<{ category: string }>({
    queryKey: ["/api/maps/last-category"],
  });

  return {
    categoriesData,
    categoriesUrl,
    exclusionsData,
    exclusionsUrl,
    hasStoreDatabase,
    lastCategoryData,
    preferencesData,
    searchHistoryData,
    sheetsData,
    sheetsLoading,
    useSqlMode,
  };
}
