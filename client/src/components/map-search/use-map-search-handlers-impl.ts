import type { FormEvent } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PlaceResult } from "@/components/map-search/map-search.types";

interface UseMapSearchHandlersProps {
  activeKeywords: string[];
  addExclusionMutation: { mutate: (params: { type: "keyword" | "place_type"; value: string }) => void };
  businessType: string;
  category: string;
  city: string;
  currentProjectId?: string;
  customCategory: string;
  filteredResults: PlaceResult[];
  hideClosedBusinesses: boolean;
  isQualificationMode: boolean;
  newKeyword: string;
  newPlaceType: string;
  searchMutation: { mutate: () => void };
  searchResults: PlaceResult[];
  selectedPlaces: Set<string>;
  setActiveKeywords: (value: string[] | ((prev: string[]) => string[])) => void;
  setActiveTypes: (value: string[] | ((prev: string[]) => string[])) => void;
  setBusinessType: (value: string) => void;
  setCategory: (value: string) => void;
  setCity: (value: string) => void;
  setCountry: (value: string) => void;
  setExportProgress: (value: { current: number; failed: number; total: number } | null) => void;
  setSelectedPlaces: (value: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setState: (value: string) => void;
  state: string;
  toast: (props: { description?: string; title: string; variant?: "default" | "destructive" }) => void;
  saveToQualificationMutation: { mutate: (payload: { category: string; placeId: string }) => void };
  saveToSheetMutation: { mutate: (payload: { category: string; placeId: string; projectId?: string }) => void };
}

export function useMapSearchHandlers(props: UseMapSearchHandlersProps) {
  const getEffectiveCategory = () => {
    if (props.isQualificationMode && props.customCategory.trim()) {
      return props.customCategory.trim();
    }
    return props.category;
  };

  const handleExportSelected = async () => {
    const effectiveCategory = getEffectiveCategory();
    if (!effectiveCategory) {
      props.toast({ title: "Category required", variant: "destructive" });
      return;
    }

    const selectedArray = Array.from(props.selectedPlaces);
    const total = selectedArray.length;

    props.setExportProgress({ current: 0, total, failed: 0 });

    const BATCH_SIZE = 5;
    let successCount = 0;
    let failedCount = 0;
    const endpoint = props.isQualificationMode ? "/api/maps/save-to-qualification" : "/api/maps/save-to-sheet";

    for (let i = 0; i < selectedArray.length; i += BATCH_SIZE) {
      const batch = selectedArray.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((placeId) =>
          apiRequest("POST", endpoint, {
            placeId,
            category: effectiveCategory,
            ...(props.currentProjectId ? { projectId: props.currentProjectId } : {}),
          }),
        ),
      );

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          successCount++;
        } else {
          failedCount++;
        }
      });

      props.setExportProgress({
        current: i + batch.length,
        total,
        failed: failedCount,
      });
    }

    props.setExportProgress(null);
    const destination = props.isQualificationMode ? "Qualification Leads" : "CRM";

    if (failedCount === 0) {
      props.toast({
        title: "Export Complete",
        description: `Successfully exported ${successCount} ${props.isQualificationMode ? "leads" : "stores"} to ${destination}`,
      });
    } else {
      props.toast({
        title: "Export Complete with Errors",
        description: `${successCount} exported successfully, ${failedCount} failed`,
        variant: failedCount === total ? "destructive" : "default",
      });
    }

    props.setSelectedPlaces(new Set());
    queryClient.invalidateQueries({ queryKey: ["/api/maps/search"] });
    if (props.isQualificationMode) {
      queryClient.invalidateQueries({ queryKey: ["/api/qualification/leads"] });
    }
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!props.businessType.trim()) {
      props.toast({
        title: "Business type required",
        description: "Please enter a business type to search for",
        variant: "destructive",
      });
      return;
    }
    if (!props.city.trim()) {
      props.toast({
        title: "City required",
        description: "Please enter a city",
        variant: "destructive",
      });
      return;
    }
    if (!props.state) {
      props.toast({
        title: "State required",
        description: "Please select a state",
        variant: "destructive",
      });
      return;
    }

    const effectiveCategory = getEffectiveCategory();
    if (!effectiveCategory) {
      props.toast({
        title: "Category required",
        description: props.isQualificationMode ? "Please select or enter a category" : "Please select a category",
        variant: "destructive",
      });
      return;
    }

    props.searchMutation.mutate();
  };

  const handleSavePlace = (placeId: string) => {
    const effectiveCategory = getEffectiveCategory();
    if (!effectiveCategory) {
      props.toast({
        title: "Category required",
        description: props.isQualificationMode
          ? "Please select or enter a category before saving"
          : "Please select a category before saving",
        variant: "destructive",
      });
      return;
    }
    if (props.isQualificationMode) {
      props.saveToQualificationMutation.mutate({ placeId, category: effectiveCategory });
    } else {
      props.saveToSheetMutation.mutate({ placeId, category: effectiveCategory, projectId: props.currentProjectId });
    }
  };

  const togglePlaceSelection = (placeId: string) => {
    props.setSelectedPlaces((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(placeId)) {
        newSet.delete(placeId);
      } else {
        newSet.add(placeId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    const allSelected = props.filteredResults.length > 0 && props.filteredResults.every((p) => props.selectedPlaces.has(p.place_id));
    if (allSelected) {
      props.setSelectedPlaces(new Set());
    } else {
      props.setSelectedPlaces(new Set(props.filteredResults.map((p) => p.place_id)));
    }
  };

  const toggleKeyword = (keyword: string) => {
    props.setActiveKeywords((prev) => {
      const newKeywords = prev.includes(keyword) ? prev.filter((k) => k !== keyword) : [...prev, keyword];
      if (props.searchResults.length > 0) {
        const newFilteredResults = props.searchResults
          .filter((p) => !props.hideClosedBusinesses || p.business_status === "OPERATIONAL")
          .filter((p) => !newKeywords.some((k) => p.name.toLowerCase().includes(k)));
        const filteredPlaceIds = new Set(newFilteredResults.map((p) => p.place_id));
        props.setSelectedPlaces((prevSelected) => {
          const newSet = new Set<string>();
          prevSelected.forEach((id) => {
            if (filteredPlaceIds.has(id)) {
              newSet.add(id);
            }
          });
          return newSet;
        });
      }
      return newKeywords;
    });
  };

  const togglePlaceType = (type: string) => {
    props.setActiveTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  const clearAllKeywords = () => props.setActiveKeywords([]);
  const clearAllTypes = () => props.setActiveTypes([]);

  const handleAddKeyword = (e: FormEvent) => {
    e.preventDefault();
    if (props.newKeyword.trim()) {
      props.addExclusionMutation.mutate({
        type: "keyword",
        value: props.newKeyword.trim(),
      });
    }
  };

  const handleAddPlaceType = (e: FormEvent) => {
    e.preventDefault();
    if (props.newPlaceType.trim()) {
      props.addExclusionMutation.mutate({
        type: "place_type",
        value: props.newPlaceType.trim().toLowerCase().replace(/\s+/g, "_"),
      });
    }
  };

  const handleSearchAgain = (
    businessTypeParam: string,
    cityParam: string,
    stateParam: string,
    countryParam: string,
    excludedKeywordsParam?: string[] | null,
    excludedTypesParam?: string[] | null,
  ) => {
    props.setBusinessType(businessTypeParam);
    props.setCity(cityParam);
    props.setState(stateParam);
    props.setCountry(countryParam);
    if (excludedKeywordsParam && excludedKeywordsParam.length > 0) {
      props.setActiveKeywords(excludedKeywordsParam);
    }
    if (excludedTypesParam && excludedTypesParam.length > 0) {
      props.setActiveTypes(excludedTypesParam);
    }
    setTimeout(() => {
      props.searchMutation.mutate();
    }, 100);
  };

  return {
    clearAllKeywords,
    clearAllTypes,
    getEffectiveCategory,
    handleAddKeyword,
    handleAddPlaceType,
    handleExportSelected,
    handleSavePlace,
    handleSearch,
    handleSearchAgain,
    toggleKeyword,
    togglePlaceSelection,
    togglePlaceType,
    toggleSelectAll,
  };
}
