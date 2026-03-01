import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { LastSearchParams } from "@/components/map-search/map-search.types";

interface UseMapSearchMutationsProps {
  activeKeywords: string[];
  activeTypes: string[];
  businessType: string;
  category: string;
  city: string;
  country: string;
  currentProjectId?: string;
  customCategory: string;
  exclusionsUrl: string;
  isQualificationMode: boolean;
  lastSearchParams: LastSearchParams | null;
  nextPageToken: string | null;
  setActiveKeywords: (value: string[] | ((prev: string[]) => string[])) => void;
  setActiveTypes: (value: string[] | ((prev: string[]) => string[])) => void;
  setCheckingDuplicates: (value: boolean) => void;
  setCity: (value: string) => void;
  setCountry: (value: string) => void;
  setDuplicateCount: (value: number) => void;
  setDuplicateWebsites: (value: Set<string>) => void;
  setGridSearchInfo: (value: { gridDuplicatesRemoved: number; totalZones: number } | null) => void;
  setLastSearchParams: (value: LastSearchParams | null) => void;
  setLoadingMore: (value: boolean) => void;
  setNewKeyword: (value: string) => void;
  setNewPlaceType: (value: string) => void;
  setNextPageToken: (value: string | null) => void;
  setSearchResults: (value: any[] | ((prev: any[]) => any[])) => void;
  setSelectedPlaces: (value: Set<string>) => void;
  setState: (value: string) => void;
  state: string;
  toast: (props: { description?: string; title: string; variant?: "default" | "destructive" }) => void;
}

export function useMapSearchMutations(props: UseMapSearchMutationsProps) {
  const reverseGeocodeMutation = useMutation({
    mutationFn: async ({ lat, lng }: { lat: number; lng: number }) => {
      return await apiRequest("POST", "/api/maps/reverse-geocode", { lat, lng });
    },
    onSuccess: (data) => {
      props.setCity(data.city);
      props.setState(data.state);
      props.setCountry(data.country);
      props.toast({
        title: "Location Selected",
        description: `${data.city}, ${data.state}`,
      });
    },
    onError: () => {
      props.toast({
        title: "Error",
        description: "Failed to get location details",
        variant: "destructive",
      });
    },
  });

  const addExclusionMutation = useMutation({
    mutationFn: async (params: { type: "keyword" | "place_type"; value: string }) => {
      return await apiRequest("POST", "/api/exclusions", {
        ...params,
        projectId: props.currentProjectId,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [props.exclusionsUrl] });
      if (variables.type === "keyword") {
        props.setActiveKeywords((prev) => [...prev, data.exclusion.value]);
        props.setNewKeyword("");
      } else {
        props.setActiveTypes((prev) => [...prev, data.exclusion.value]);
        props.setNewPlaceType("");
      }
      props.toast({
        title: "Exclusion added",
        description: `"${data.exclusion.value}" has been added and activated`,
      });
    },
    onError: (error: any) => {
      props.toast({
        title: "Failed to add exclusion",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const loadMoreMutation = useMutation({
    mutationFn: async () => {
      if (!props.lastSearchParams || !props.nextPageToken) return;

      props.setLoadingMore(true);
      return await apiRequest("POST", "/api/maps/search", {
        ...props.lastSearchParams,
        pageToken: props.nextPageToken,
      });
    },
    onSuccess: (data) => {
      if (data) {
        props.setSearchResults((prev: any[]) => [...prev, ...(data.results || [])]);
        props.setNextPageToken(data.nextPageToken || null);
        props.setLoadingMore(false);
      }
    },
    onError: (error: Error) => {
      props.setLoadingMore(false);
      props.toast({
        title: "Failed to load more",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const searchMutation = useMutation({
    mutationFn: async () => {
      const location = [props.city, props.state, props.country].filter(Boolean).join(", ");
      const params = {
        query: props.businessType,
        location,
        excludedKeywords: props.activeKeywords,
        excludedTypes: props.activeTypes,
        category: props.category || undefined,
      };

      props.setLastSearchParams(params);
      props.setSearchResults([]);
      props.setNextPageToken(null);
      props.setSelectedPlaces(new Set());
      props.setGridSearchInfo(null);

      return await apiRequest("POST", "/api/maps/grid-search", params);
    },
    onSuccess: async (data) => {
      const results = data.results || [];
      props.setSearchResults(results);
      props.setNextPageToken(null);
      props.setDuplicateCount(data.duplicateCount || 0);
      const excludedCount = data.excludedCount || 0;

      props.setGridSearchInfo({
        totalZones: data.totalZones || 1,
        gridDuplicatesRemoved: data.gridDuplicatesRemoved || 0,
      });

      if (results.length > 0) {
        props.setCheckingDuplicates(true);
        try {
          const websites = results.map((r: any) => r.website).filter((w: string | undefined): w is string => !!w);
          if (websites.length > 0) {
            const dupResponse = await apiRequest("POST", "/api/maps/check-duplicates", { websites });
            const duplicates = new Set<string>(dupResponse.duplicates || []);
            props.setDuplicateWebsites(duplicates);
          } else {
            props.setDuplicateWebsites(new Set());
          }
        } catch (error) {
          console.error("Failed to check duplicates:", error);
          props.setDuplicateWebsites(new Set());
        } finally {
          props.setCheckingDuplicates(false);
        }
      } else {
        props.setDuplicateWebsites(new Set());
      }

      const effectiveCategory = props.isQualificationMode ? props.customCategory.trim() : props.category;
      if (effectiveCategory) {
        try {
          await apiRequest("POST", "/api/maps/last-category", { category: effectiveCategory });
        } catch (error) {
          console.error("Failed to save last category:", error);
        }
      }

      if (!results || results.length === 0) {
        props.toast({
          title: "No results found",
          description:
            data.duplicateCount > 0
              ? `All ${data.duplicateCount} results were already in your database`
              : "Try adjusting your search terms or location",
        });
      } else {
        let description = "";
        const parts = [];
        if (data.totalZones && data.totalZones > 1) {
          parts.push(`searched ${data.totalZones} zones`);
        }
        if (data.duplicateCount > 0) {
          parts.push(`${data.duplicateCount} already imported`);
        }
        if (excludedCount > 0) {
          parts.push(`${excludedCount} excluded`);
        }
        if (data.gridDuplicatesRemoved > 0) {
          parts.push(`${data.gridDuplicatesRemoved} zone overlaps removed`);
        }
        if (parts.length > 0) {
          description = parts.join(", ");
        }
        props.toast({
          title: `Found ${results.length} new results`,
          description: description || undefined,
        });
      }
    },
    onError: (error: Error) => {
      props.toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveToSheetMutation = useMutation({
    mutationFn: async ({ placeId, category, projectId }: { placeId: string; category: string; projectId?: string }) => {
      return await apiRequest("POST", "/api/maps/save-to-sheet", {
        placeId,
        category,
        ...(projectId ? { projectId } : {}),
      });
    },
    onSuccess: (data) => {
      props.toast({
        title: "Success",
        description: `${data.place.name} saved to Store Database`,
      });
    },
    onError: (error: Error) => {
      props.toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveToQualificationMutation = useMutation({
    mutationFn: async ({ placeId, category }: { placeId: string; category: string }) => {
      return await apiRequest("POST", "/api/maps/save-to-qualification", {
        placeId,
        category,
        projectId: props.currentProjectId,
      });
    },
    onSuccess: (data) => {
      props.toast({
        title: "Success",
        description: `${data.place?.name || "Lead"} added to Qualification Leads`,
      });
    },
    onError: (error: Error) => {
      props.toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    addExclusionMutation,
    loadMoreMutation,
    reverseGeocodeMutation,
    saveToQualificationMutation,
    saveToSheetMutation,
    searchMutation,
  };
}
