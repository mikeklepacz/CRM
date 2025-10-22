import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { Search, MapPin, Plus, Loader2, Check, ChevronsUpDown, ChevronRight, ChevronLeft, X, Settings2, Bone, ExternalLink, Download } from "lucide-react";
import { Link } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { SearchHistoryComponent } from "@/components/search-history";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  business_status?: string;
  rating?: number;
  user_ratings_total?: number;
  website?: string;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

interface SavedExclusion {
  id: string;
  type: 'keyword' | 'place_type';
  value: string;
  createdAt: string;
}

interface SearchHistory {
  id: string;
  businessType: string;
  city: string;
  state: string;
  country: string;
  searchCount: number;
  searchedAt: string;
}

interface LastSearchParams {
  query: string;
  location: string;
  excludedKeywords: string[];
  excludedTypes: string[];
  category?: string;
}

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
];

const COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Australia", "Germany", "France",
  "Spain", "Italy", "Japan", "Mexico", "Brazil", "India", "China"
];

// Dark mode styles for Google Maps
const DARK_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];

export default function MapSearch() {
  const { toast } = useToast();
  const { actualTheme } = useTheme();
  const [businessType, setBusinessType] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("United States");
  const [stateOpen, setStateOpen] = useState(false);
  const [businessTypeOpen, setBusinessTypeOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [hideClosedBusinesses, setHideClosedBusinesses] = useState(true);
  const [duplicateCount, setDuplicateCount] = useState(0);
  
  // Map state
  const [mapCenter, setMapCenter] = useState({ lat: 39.8283, lng: -98.5795 }); // Center of USA
  const [mapZoom, setMapZoom] = useState(4);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Pagination state
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  const [lastSearchParams, setLastSearchParams] = useState<LastSearchParams | null>(null);
  
  // Ref for scroll container
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  
  // Filters panel state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newPlaceType, setNewPlaceType] = useState("");
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const [activeTypes, setActiveTypes] = useState<string[]>([]);

  // Export progress state
  const [exportProgress, setExportProgress] = useState<{
    current: number;
    total: number;
    failed: number;
  } | null>(null);

  // Show/hide search history state
  const [showSearchHistory, setShowSearchHistory] = useState(true);

  const { data: categoriesData } = useQuery<{ categories: Category[] }>({
    queryKey: ["/api/categories/active"],
  });

  // Fetch saved exclusions
  const { data: exclusionsData } = useQuery<{ exclusions: SavedExclusion[] }>({
    queryKey: ["/api/exclusions"],
  });

  // Fetch user preferences to get active exclusions
  const { data: preferencesData } = useQuery<{ preferences: any }>({
    queryKey: ["/api/user/preferences"],
  });

  // Fetch search history for business type combobox
  const { data: searchHistoryData } = useQuery<{ history: SearchHistory[] }>({
    queryKey: ["/api/maps/search-history"],
  });

  // Fetch last selected category
  const { data: lastCategoryData } = useQuery<{ category: string }>({
    queryKey: ["/api/maps/last-category"],
  });

  // Initialize category from last selection (defaults to 'Pets' if never chosen)
  useEffect(() => {
    if (lastCategoryData?.category) {
      setCategory(lastCategoryData.category);
    } else {
      // Default to 'Pets' if no last category exists
      setCategory("Pets");
    }
  }, [lastCategoryData]);

  // Initialize active exclusions from user preferences
  useEffect(() => {
    if (preferencesData?.preferences) {
      setActiveKeywords(preferencesData.preferences.activeExcludedKeywords || []);
      setActiveTypes(preferencesData.preferences.activeExcludedTypes || []);
    }
  }, [preferencesData]);

  // Save active exclusions to user preferences whenever they change
  useEffect(() => {
    const saveActiveExclusions = async () => {
      try {
        await apiRequest("PUT", "/api/user/active-exclusions", {
          activeKeywords,
          activeTypes,
        });
      } catch (error) {
        console.error("Failed to save active exclusions:", error);
      }
    };

    if (preferencesData) {
      saveActiveExclusions();
    }
  }, [activeKeywords, activeTypes, preferencesData]);

  // Infinite scroll implementation
  useEffect(() => {
    const container = resultsContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // Trigger load more when within 200px of bottom
      if (distanceFromBottom < 200 && nextPageToken && !loadingMore) {
        loadMoreMutation.mutate();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [nextPageToken, loadingMore]);

  // Reverse geocode mutation
  const reverseGeocodeMutation = useMutation({
    mutationFn: async ({ lat, lng }: { lat: number; lng: number }) => {
      return await apiRequest("POST", "/api/maps/reverse-geocode", { lat, lng });
    },
    onSuccess: (data) => {
      setCity(data.city);
      setState(data.state);
      setCountry(data.country);
      toast({
        title: "Location Selected",
        description: `${data.city}, ${data.state}`
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to get location details",
        variant: "destructive"
      });
    }
  });

  // Map click handler
  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setSelectedLocation({ lat, lng });
      setMapCenter({ lat, lng });
      setMapZoom(12);
      reverseGeocodeMutation.mutate({ lat, lng });
    }
  };

  // Mutation to add new exclusion
  const addExclusionMutation = useMutation({
    mutationFn: async (params: { type: 'keyword' | 'place_type', value: string }) => {
      return await apiRequest("POST", "/api/exclusions", params);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/exclusions"] });
      // Automatically check the newly added exclusion
      if (variables.type === 'keyword') {
        setActiveKeywords(prev => [...prev, data.exclusion.value]);
        setNewKeyword("");
      } else {
        setActiveTypes(prev => [...prev, data.exclusion.value]);
        setNewPlaceType("");
      }
      toast({
        title: "Exclusion added",
        description: `"${data.exclusion.value}" has been added and activated`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add exclusion",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Load more mutation for pagination
  const loadMoreMutation = useMutation({
    mutationFn: async () => {
      if (!lastSearchParams || !nextPageToken) return;
      
      setLoadingMore(true);
      return await apiRequest("POST", "/api/maps/search", {
        ...lastSearchParams,
        pageToken: nextPageToken,
      });
    },
    onSuccess: (data) => {
      if (data) {
        // Append new results to existing
        setSearchResults(prev => [...prev, ...(data.results || [])]);
        setNextPageToken(data.nextPageToken || null);
        setLoadingMore(false);
      }
    },
    onError: (error: Error) => {
      setLoadingMore(false);
      toast({
        title: "Failed to load more",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const searchMutation = useMutation({
    mutationFn: async () => {
      const location = [city, state, country].filter(Boolean).join(", ");
      const params = {
        query: businessType,
        location,
        excludedKeywords: activeKeywords,
        excludedTypes: activeTypes,
        category: category || undefined,
      };
      
      // Store search params for pagination
      setLastSearchParams(params);
      
      // Reset state for new search
      setSearchResults([]);
      setNextPageToken(null);
      setSelectedPlaces(new Set());
      
      return await apiRequest("POST", "/api/maps/search", params);
    },
    onSuccess: async (data) => {
      setSearchResults(data.results || []);
      setNextPageToken(data.nextPageToken || null);
      setDuplicateCount(data.duplicateCount || 0);
      const excludedCount = data.excludedCount || 0;
      
      // Save the selected category as the last used category
      if (category) {
        try {
          await apiRequest("POST", "/api/maps/last-category", { category });
        } catch (error) {
          console.error("Failed to save last category:", error);
        }
      }
      
      if (!data.results || data.results.length === 0) {
        toast({
          title: "No results found",
          description: data.duplicateCount > 0 
            ? `All ${data.duplicateCount} results were already in your database`
            : "Try adjusting your search terms or location",
        });
      } else {
        let description = '';
        const parts = [];
        if (data.duplicateCount > 0) {
          parts.push(`${data.duplicateCount} duplicate${data.duplicateCount > 1 ? 's' : ''}`);
        }
        if (excludedCount > 0) {
          parts.push(`${excludedCount} excluded`);
        }
        if (parts.length > 0) {
          description = `${parts.join(', ')} filtered out`;
          toast({
            title: `${data.results.length} new results`,
            description,
          });
        }
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveToSheetMutation = useMutation({
    mutationFn: async ({ placeId, category }: { placeId: string; category: string }) => {
      return await apiRequest("POST", "/api/maps/save-to-sheet", {
        placeId,
        category,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `${data.place.name} saved to Store Database`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Export to CRM functionality with batched processing
  const handleExportSelected = async () => {
    if (!category) {
      toast({ title: "Category required", variant: "destructive" });
      return;
    }

    const selectedArray = Array.from(selectedPlaces);
    const total = selectedArray.length;
    
    setExportProgress({ current: 0, total, failed: 0 });

    const BATCH_SIZE = 5;
    let successCount = 0;
    let failedCount = 0;

    // Process in batches of 5
    for (let i = 0; i < selectedArray.length; i += BATCH_SIZE) {
      const batch = selectedArray.slice(i, i + BATCH_SIZE);
      
      // Process current batch in parallel
      const results = await Promise.allSettled(
        batch.map(placeId =>
          apiRequest("POST", "/api/maps/save-to-sheet", { placeId, category })
        )
      );

      // Count successes and failures
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          failedCount++;
        }
      });

      // Update progress after each batch
      setExportProgress({
        current: i + batch.length,
        total,
        failed: failedCount
      });
    }

    // Clear progress and show final toast
    setExportProgress(null);
    
    if (failedCount === 0) {
      toast({
        title: "Export Complete",
        description: `Successfully exported ${successCount} stores to CRM`
      });
    } else {
      toast({
        title: "Export Complete with Errors",
        description: `${successCount} exported successfully, ${failedCount} failed`,
        variant: failedCount === total ? "destructive" : "default"
      });
    }

    // Clear selections
    setSelectedPlaces(new Set());
    
    // Invalidate the search results query to refresh imported status
    queryClient.invalidateQueries({ queryKey: ['/api/maps/search'] });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!businessType.trim()) {
      toast({
        title: "Business type required",
        description: "Please enter a business type to search for",
        variant: "destructive",
      });
      return;
    }
    
    if (!city.trim()) {
      toast({
        title: "City required",
        description: "Please enter a city",
        variant: "destructive",
      });
      return;
    }
    
    if (!state) {
      toast({
        title: "State required",
        description: "Please select a state",
        variant: "destructive",
      });
      return;
    }
    
    if (!category) {
      toast({
        title: "Category required",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }
    
    searchMutation.mutate();
  };

  const handleSavePlace = (placeId: string) => {
    if (!category) {
      toast({
        title: "Category required",
        description: "Please select a category before saving",
        variant: "destructive",
      });
      return;
    }
    saveToSheetMutation.mutate({ placeId, category });
  };

  // Toggle place selection
  const togglePlaceSelection = (placeId: string) => {
    setSelectedPlaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(placeId)) {
        newSet.delete(placeId);
      } else {
        newSet.add(placeId);
      }
      return newSet;
    });
  };

  // Toggle select all - only selects visible filtered results
  const toggleSelectAll = () => {
    const allSelected = filteredResults.length > 0 && filteredResults.every(p => selectedPlaces.has(p.place_id));
    
    if (allSelected) {
      // Deselect all
      setSelectedPlaces(new Set());
    } else {
      // Select all visible filtered results
      setSelectedPlaces(new Set(filteredResults.map(p => p.place_id)));
    }
  };

  // Toggle keyword exclusion - also cleans selected places when filtering
  const toggleKeyword = (keyword: string) => {
    setActiveKeywords(prev => {
      const newKeywords = prev.includes(keyword)
        ? prev.filter(k => k !== keyword)
        : [...prev, keyword];
      
      // If we have search results, clean up selected places that are now filtered out
      if (searchResults.length > 0) {
        const newFilteredResults = searchResults
          .filter(p => !hideClosedBusinesses || p.business_status === 'OPERATIONAL')
          .filter(p => !newKeywords.some(k => p.name.toLowerCase().includes(k)));
        
        const filteredPlaceIds = new Set(newFilteredResults.map(p => p.place_id));
        setSelectedPlaces(prev => {
          const newSet = new Set<string>();
          prev.forEach(id => {
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

  // Toggle place type exclusion
  const togglePlaceType = (type: string) => {
    setActiveTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Clear all active keywords
  const clearAllKeywords = () => {
    setActiveKeywords([]);
  };

  // Clear all active place types
  const clearAllTypes = () => {
    setActiveTypes([]);
  };

  // Add new keyword exclusion
  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newKeyword.trim()) {
      addExclusionMutation.mutate({
        type: 'keyword',
        value: newKeyword.trim(),
      });
    }
  };

  // Add new place type exclusion
  const handleAddPlaceType = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaceType.trim()) {
      addExclusionMutation.mutate({
        type: 'place_type',
        value: newPlaceType.trim().toLowerCase().replace(/\s+/g, '_'),
      });
    }
  };

  // Get sorted keywords and place types
  const keywords = (exclusionsData?.exclusions || [])
    .filter(e => e.type === 'keyword')
    .map(e => e.value)
    .sort();
  
  const placeTypes = (exclusionsData?.exclusions || [])
    .filter(e => e.type === 'place_type')
    .map(e => e.value)
    .sort();

  const parseCityState = (address: string) => {
    const parts = address.split(',').map(p => p.trim());
    if (parts.length >= 3) {
      const city = parts[parts.length - 3] || '';
      const stateZip = parts[parts.length - 2] || '';
      const stateParts = stateZip.split(' ');
      const state = stateParts[0] || '';
      return { city, state };
    }
    return { city: '', state: '' };
  };

  const handleSearchAgain = (
    businessTypeParam: string,
    cityParam: string,
    stateParam: string,
    countryParam: string,
    excludedKeywordsParam?: string[] | null,
    excludedTypesParam?: string[] | null
  ) => {
    // Populate form fields
    setBusinessType(businessTypeParam);
    setCity(cityParam);
    setState(stateParam);
    setCountry(countryParam);
    
    // Set active exclusions if provided
    if (excludedKeywordsParam && excludedKeywordsParam.length > 0) {
      setActiveKeywords(excludedKeywordsParam);
    }

    if (excludedTypesParam && excludedTypesParam.length > 0) {
      setActiveTypes(excludedTypesParam);
    }

    // Trigger search automatically
    setTimeout(() => {
      searchMutation.mutate();
    }, 100);
  };

  // Get business link (website or Google Maps)
  const getBusinessLink = (place: PlaceResult) => {
    if (place.website) {
      return place.website;
    }
    return `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;
  };

  // Compute filtered results with both closed business filter and active keywords
  const filteredResults = searchResults
    .filter(p => !hideClosedBusinesses || p.business_status === 'OPERATIONAL')
    .filter(p => !activeKeywords.some(keyword => p.name.toLowerCase().includes(keyword)));
  
  const showCheckboxes = searchResults.length >= 2;
  const allSelected = filteredResults.length > 0 && filteredResults.every(p => selectedPlaces.has(p.place_id));
  
  // Count of results hidden by keyword filters
  const resultsWithoutClosedFilter = searchResults.filter(p => !hideClosedBusinesses || p.business_status === 'OPERATIONAL');
  const hiddenByKeywordFilters = resultsWithoutClosedFilter.length - filteredResults.length;

  return (
    <div className="relative w-full h-[90vh] overflow-hidden" data-testid="map-container">
      {/* Full-screen Google Map Background */}
      <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={mapCenter}
          zoom={mapZoom}
          onClick={handleMapClick}
          options={{ 
            disableDefaultUI: false, 
            zoomControl: true,
            fullscreenControl: false
          }}
        >
          {selectedLocation && <Marker position={selectedLocation} />}
        </GoogleMap>
      </LoadScript>

      {/* Combined Container for Search Form and History */}
      <div className="absolute top-4 left-4 right-4 z-10 max-w-xl space-y-4">
        {/* Search Businesses Card */}
        <Card className="backdrop-blur-md bg-background/80 flex flex-col max-h-[65vh] overflow-hidden">
          <CardHeader className="flex-shrink-0 p-4 pb-2">
            <CardTitle className="text-lg">Search Businesses</CardTitle>
            <CardDescription className="text-sm">
              Find local businesses using Google Maps and add them to your database
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-y-auto flex-1 p-4 pt-2">
            <div className="mb-3 flex items-center gap-2 pb-3 border-b">
              <Checkbox
                id="show-search-history"
                checked={showSearchHistory}
                onCheckedChange={(checked) => setShowSearchHistory(checked as boolean)}
                data-testid="checkbox-show-history"
              />
              <Label htmlFor="show-search-history" className="cursor-pointer text-sm">
                Show Map Search History
              </Label>
            </div>
            <form onSubmit={handleSearch} className="space-y-3">
              {/* Row 1: Business Type, Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Business Type *</Label>
                  <Popover open={businessTypeOpen} onOpenChange={setBusinessTypeOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={businessTypeOpen}
                        className="w-full justify-between"
                        data-testid="button-business-type-select"
                      >
                        {businessType || "Select or type business type..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command shouldFilter={false}>
                        <CommandInput 
                          placeholder="Type to search or enter new..." 
                          value={businessType}
                          onValueChange={setBusinessType}
                        />
                        <CommandList>
                          {searchHistoryData?.history && searchHistoryData.history.length > 0 ? (
                            <>
                              <CommandGroup heading="Recent Searches (by popularity)">
                                {searchHistoryData.history
                                  .sort((a, b) => b.searchCount - a.searchCount)
                                  .slice(0, 10)
                                  .map((entry) => (
                                    <CommandItem
                                      key={entry.id}
                                      value={entry.businessType}
                                      onSelect={(currentValue) => {
                                        setBusinessType(currentValue);
                                        setBusinessTypeOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          businessType === entry.businessType ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex-1">
                                        <div>{entry.businessType}</div>
                                        <div className="text-xs text-muted-foreground">
                                          Searched {entry.searchCount}x
                                        </div>
                                      </div>
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </>
                          ) : (
                            <CommandEmpty>Type to enter a business type</CommandEmpty>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesData?.categories
                        .filter((cat) => cat.isActive)
                        .map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Country, State, City */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger data-testid="select-country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((countryName) => (
                        <SelectItem key={countryName} value={countryName}>
                          {countryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>State *</Label>
                  <Popover open={stateOpen} onOpenChange={setStateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={stateOpen}
                        className="w-full justify-between"
                        data-testid="button-state-select"
                      >
                        {state || "Select state..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command
                        filter={(value, search) => {
                          // Prefix matching: only match if state starts with search term
                          if (value.toLowerCase().startsWith(search.toLowerCase())) return 1;
                          return 0;
                        }}
                      >
                        <CommandInput placeholder="Search state..." />
                        <CommandList>
                          <CommandEmpty>No state found.</CommandEmpty>
                          <CommandGroup>
                            {US_STATES.map((stateName) => (
                              <CommandItem
                                key={stateName}
                                value={stateName}
                                onSelect={(currentValue) => {
                                  setState(currentValue);
                                  setStateOpen(false);
                                }}
                                data-testid={`state-${stateName.toLowerCase().replace(/\s+/g, '-')}`}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    state === stateName ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {stateName}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="e.g., Denver, Portland"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    data-testid="input-city"
                  />
                </div>
              </div>

              {/* Filters Panel */}
              <div className="border rounded-md">
                <div className="flex items-center justify-between pr-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setFiltersOpen(!filtersOpen)}
                    className="flex-1 justify-start hover-elevate"
                    data-testid="button-filters-toggle"
                  >
                    <div className="flex items-center gap-2">
                      {filtersOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="font-medium">Filters</span>
                      {(activeKeywords.length > 0 || activeTypes.length > 0) && (
                        <Badge variant="secondary" className="ml-2">
                          {activeKeywords.length + activeTypes.length} active
                        </Badge>
                      )}
                    </div>
                  </Button>
                  <Link href="/map-search-settings">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      data-testid="button-filters-settings"
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                {filtersOpen && (
                  <div className="p-4 space-y-3 border-t">
                    {/* Hide Keyword Results Section */}
                    <Collapsible defaultOpen={false}>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-0 hover-elevate">
                              <Label className="cursor-pointer font-semibold">Hide Keyword Results</Label>
                            </Button>
                          </CollapsibleTrigger>
                          {activeKeywords.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={clearAllKeywords}
                              data-testid="button-clear-keywords"
                            >
                              Clear All
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Dual-purpose: filters backend results when checked before search, filters visible results when checked after
                        </p>

                        <CollapsibleContent>
                          {/* Add new keyword */}
                          <div className="flex gap-2 mb-3">
                            <Input
                              placeholder="Add keyword to exclude..."
                              value={newKeyword}
                              onChange={(e) => setNewKeyword(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (newKeyword.trim()) {
                                    addExclusionMutation.mutate({
                                      type: 'keyword',
                                      value: newKeyword.trim(),
                                    });
                                  }
                                }
                              }}
                              data-testid="input-new-keyword"
                            />
                            <Button
                              type="button"
                              size="sm"
                              disabled={!newKeyword.trim() || addExclusionMutation.isPending}
                              onClick={() => {
                                if (newKeyword.trim()) {
                                  addExclusionMutation.mutate({
                                    type: 'keyword',
                                    value: newKeyword.trim(),
                                  });
                                }
                              }}
                              data-testid="button-add-keyword"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </Button>
                          </div>

                          {/* Keyword checkboxes */}
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {keywords.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic">No keywords saved yet</p>
                            ) : (
                              keywords.map((keyword) => (
                                <div key={keyword} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`keyword-${keyword}`}
                                    checked={activeKeywords.includes(keyword)}
                                    onCheckedChange={() => toggleKeyword(keyword)}
                                    data-testid={`checkbox-keyword-${keyword}`}
                                  />
                                  <Label
                                    htmlFor={`keyword-${keyword}`}
                                    className="cursor-pointer text-sm flex-1"
                                  >
                                    {keyword}
                                  </Label>
                                </div>
                              ))
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>

                    {/* Exclude Place Types Section */}
                    <Collapsible defaultOpen={false}>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-0 hover-elevate">
                              <Label className="cursor-pointer font-semibold">Exclude Place Types</Label>
                            </Button>
                          </CollapsibleTrigger>
                          {activeTypes.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={clearAllTypes}
                              data-testid="button-clear-types"
                            >
                              Clear All
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          API-level filtering - saves credits by excluding before results
                        </p>

                        <CollapsibleContent>
                          {/* Add new place type */}
                          <div className="flex gap-2 mb-3">
                            <Input
                              placeholder="Add place type to exclude..."
                              value={newPlaceType}
                              onChange={(e) => setNewPlaceType(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (newPlaceType.trim()) {
                                    addExclusionMutation.mutate({
                                      type: 'place_type',
                                      value: newPlaceType.trim().toLowerCase().replace(/\s+/g, '_'),
                                    });
                                  }
                                }
                              }}
                              data-testid="input-new-place-type"
                            />
                            <Button
                              type="button"
                              size="sm"
                              disabled={!newPlaceType.trim() || addExclusionMutation.isPending}
                              onClick={() => {
                                if (newPlaceType.trim()) {
                                  addExclusionMutation.mutate({
                                    type: 'place_type',
                                    value: newPlaceType.trim().toLowerCase().replace(/\s+/g, '_'),
                                  });
                                }
                              }}
                              data-testid="button-add-place-type"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </Button>
                          </div>

                          {/* Place type checkboxes */}
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {placeTypes.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic">No place types saved yet</p>
                            ) : (
                              placeTypes.map((type) => (
                                <div key={type} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`type-${type}`}
                                    checked={activeTypes.includes(type)}
                                    onCheckedChange={() => togglePlaceType(type)}
                                    data-testid={`checkbox-type-${type}`}
                                  />
                                  <Label
                                    htmlFor={`type-${type}`}
                                    className="cursor-pointer text-sm flex-1"
                                  >
                                    {type}
                                  </Label>
                                </div>
                              ))
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={searchMutation.isPending}
                className="w-full md:w-auto"
                data-testid="button-search"
              >
                {searchMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Map Search History Card - conditionally shown */}
        {showSearchHistory && (
          <Card className="backdrop-blur-md bg-background/80">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-semibold" data-testid="text-page-title">Map Search History</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Global history of all Map Search queries
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <SearchHistoryComponent onSearchAgain={handleSearchAgain} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Slide-in Results Panel (Right) - only visible when searchResults exist */}
      {searchResults.length > 0 && (
        <div className="absolute top-0 right-0 bottom-0 w-1/3 min-w-[500px] z-20 bg-background shadow-2xl overflow-y-auto" ref={resultsContainerRef}>
          <div className="p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-2xl font-semibold">
                    Search Results
                    {hiddenByKeywordFilters > 0 ? (
                      <span className="text-sm font-normal ml-2">
                        (Showing {filteredResults.length} of {searchResults.length} results)
                        {hiddenByKeywordFilters > 0 && (
                          <span className="text-muted-foreground">
                            {' '}({hiddenByKeywordFilters} hidden by keyword filters)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-sm font-normal ml-2">({filteredResults.length})</span>
                    )}
                    {duplicateCount > 0 && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        ({duplicateCount} duplicate{duplicateCount > 1 ? 's' : ''} filtered)
                      </span>
                    )}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {showCheckboxes 
                      ? "Select businesses and use the export bar to save to your database" 
                      : "Click 'Add to Database' to save a business to your Store Database sheet"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hide-closed"
                  checked={hideClosedBusinesses}
                  onCheckedChange={(checked) => setHideClosedBusinesses(checked as boolean)}
                  data-testid="checkbox-hide-closed"
                />
                <Label htmlFor="hide-closed" className="cursor-pointer text-sm">
                  Hide closed businesses
                </Label>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {showCheckboxes && <TableHead className="w-12">Select</TableHead>}
                    <TableHead>Name & Rating</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Location</TableHead>
                    {!showCheckboxes && <TableHead>Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((place) => {
                    const { city: placeCity, state: placeState } = parseCityState(place.formatted_address);
                    const businessLink = getBusinessLink(place);
                    
                    return (
                      <TableRow key={place.place_id} data-testid={`row-place-${place.place_id}`}>
                        {showCheckboxes && (
                          <TableCell>
                            <Checkbox
                              checked={selectedPlaces.has(place.place_id)}
                              onCheckedChange={() => togglePlaceSelection(place.place_id)}
                              data-testid={`checkbox-place-${place.place_id}`}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <a
                                href={businessLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-base hover:underline flex items-center gap-1"
                                data-testid={`link-place-${place.place_id}`}
                              >
                                {place.name}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                            {place.rating ? (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <span className="text-yellow-500">★</span>
                                <span className="font-medium">{place.rating}</span>
                                <span>({place.user_ratings_total?.toLocaleString()} reviews)</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">No reviews</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <span className="line-clamp-2">{place.formatted_address}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span className="font-medium">{placeCity}</span>
                            <span className="text-muted-foreground">{placeState}</span>
                          </div>
                        </TableCell>
                        {!showCheckboxes && (
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleSavePlace(place.place_id)}
                              disabled={saveToSheetMutation.isPending}
                              data-testid={`button-save-${place.place_id}`}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Add to Database
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            {/* Dog Bone Loading Indicator */}
            {loadingMore && (
              <div className="flex justify-center items-center py-8" data-testid="loading-more-indicator">
                <Bone className="h-8 w-8 text-primary animate-pulse" />
              </div>
            )}
          </div>

          {/* Export Bar - Fixed at bottom of results panel */}
          {showCheckboxes && (
            <div 
              className="sticky bottom-0 bg-background border-t p-4"
              data-testid="export-bar"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                  <Label htmlFor="select-all" className="cursor-pointer text-sm font-medium">
                    Select All
                  </Label>
                </div>
                
                <Badge variant="secondary" data-testid="badge-selected-count">
                  {selectedPlaces.size} selected
                </Badge>
                
                <Button
                  onClick={handleExportSelected}
                  disabled={selectedPlaces.size === 0 || exportProgress !== null}
                  data-testid="button-export-crm"
                >
                  {exportProgress ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting {exportProgress.current}/{exportProgress.total}...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export to CRM ({selectedPlaces.size})
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No results message */}
      {searchMutation.isSuccess && searchResults.length === 0 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <Card className="backdrop-blur-md bg-background/80">
            <CardContent className="py-12 px-8 text-center">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No results found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or location
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
