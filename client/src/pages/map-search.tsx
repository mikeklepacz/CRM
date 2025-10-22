import { useState, useEffect } from "react";
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
import { Search, MapPin, Plus, Loader2, Check, ChevronsUpDown, ChevronRight, ChevronLeft, X, Settings2 } from "lucide-react";
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

export default function MapSearch() {
  const { toast } = useToast();
  const [businessType, setBusinessType] = useState("");
  const [category, setCategory] = useState("");
  const [radius, setRadius] = useState<string>("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("United States");
  const [stateOpen, setStateOpen] = useState(false);
  const [businessTypeOpen, setBusinessTypeOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [hideClosedBusinesses, setHideClosedBusinesses] = useState(true);
  const [duplicateCount, setDuplicateCount] = useState(0);
  
  // Filters panel state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newPlaceType, setNewPlaceType] = useState("");
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const [activeTypes, setActiveTypes] = useState<string[]>([]);

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

  const searchMutation = useMutation({
    mutationFn: async () => {
      const location = [city, state, country].filter(Boolean).join(", ");
      return await apiRequest("POST", "/api/maps/search", {
        query: businessType,
        location,
        excludedKeywords: activeKeywords,
        excludedTypes: activeTypes,
        category: category || undefined,
        radius: radius ? parseFloat(radius) : undefined,
      });
    },
    onSuccess: async (data) => {
      setSearchResults(data.results || []);
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
    
    if (!selectedCategory) {
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
    if (!selectedCategory) {
      toast({
        title: "Category required",
        description: "Please select a category before saving",
        variant: "destructive",
      });
      return;
    }
    saveToSheetMutation.mutate({ placeId, category: selectedCategory });
  };

  // Toggle keyword exclusion
  const toggleKeyword = (keyword: string) => {
    setActiveKeywords(prev => 
      prev.includes(keyword)
        ? prev.filter(k => k !== keyword)
        : [...prev, keyword]
    );
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Map Search</h1>
        </div>
        <p className="text-muted-foreground">
          Search for businesses and add them to your Store Database
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <SearchHistoryComponent onSearchAgain={handleSearchAgain} />
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search Businesses</CardTitle>
            <CardDescription>
              Find local businesses using Google Maps and add them to your database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              {/* Row 1: Business Type, Category, Radius */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                <div className="space-y-2">
                  <Label htmlFor="radius">Radius (miles)</Label>
                  <Input
                    id="radius"
                    type="number"
                    placeholder="e.g., 5, 10, 25"
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    min="1"
                    step="1"
                    data-testid="input-radius"
                  />
                </div>
              </div>

              {/* Row 2: Country, State, City */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <div className="p-4 space-y-4 border-t">
                    {/* Hide Keyword Results Section */}
                    <Collapsible defaultOpen={true}>
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
                          Backend filtering - filters out results after API call
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
                    <Collapsible defaultOpen={true}>
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

        {searchResults.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    Search Results ({searchResults.filter(p => !hideClosedBusinesses || p.business_status === 'OPERATIONAL').length})
                    {duplicateCount > 0 && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        ({duplicateCount} duplicate{duplicateCount > 1 ? 's' : ''} filtered)
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Click "Add to Database" to save a business to your Store Database sheet
                  </CardDescription>
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
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name & Rating</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults
                      .filter(place => !hideClosedBusinesses || place.business_status === 'OPERATIONAL')
                      .map((place) => {
                      const { city: placeCity, state: placeState } = parseCityState(place.formatted_address);
                      return (
                        <TableRow key={place.place_id} data-testid={`row-place-${place.place_id}`}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col gap-1">
                              <span className="text-base">{place.name}</span>
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
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {searchMutation.isSuccess && searchResults.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No results found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or location
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
