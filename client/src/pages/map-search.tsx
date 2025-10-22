import { useState } from "react";
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
import { Search, MapPin, Plus, Loader2, Check, ChevronsUpDown } from "lucide-react";
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
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("United States");
  const [stateOpen, setStateOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [hideClosedBusinesses, setHideClosedBusinesses] = useState(true);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [excludedKeywords, setExcludedKeywords] = useState("");
  const [excludedTypes, setExcludedTypes] = useState("");

  const { data: categoriesData } = useQuery<{ categories: Category[] }>({
    queryKey: ["/api/categories/active"],
  });

  const searchMutation = useMutation({
    mutationFn: async () => {
      const location = [city, state, country].filter(Boolean).join(", ");
      return await apiRequest("POST", "/api/maps/search", {
        query: businessType,
        location,
        excludedKeywords,
        excludedTypes,
      });
    },
    onSuccess: (data) => {
      setSearchResults(data.results || []);
      setDuplicateCount(data.duplicateCount || 0);
      const excludedCount = data.excludedCount || 0;
      
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
    
    // Set excluded keywords if provided
    if (excludedKeywordsParam && excludedKeywordsParam.length > 0) {
      setExcludedKeywords(excludedKeywordsParam.join(', '));
    } else {
      setExcludedKeywords('');
    }

    // Set excluded types if provided
    if (excludedTypesParam && excludedTypesParam.length > 0) {
      setExcludedTypes(excludedTypesParam.join(', '));
    } else {
      setExcludedTypes('');
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type *</Label>
                  <Input
                    id="businessType"
                    placeholder="e.g., pet store, dispensary"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    data-testid="input-business-type"
                  />
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
                  <Label htmlFor="category">Category *</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesData?.categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excludedKeywords">Exclude Keywords (optional)</Label>
                <Input
                  id="excludedKeywords"
                  placeholder="e.g., PetSmart, Pet Supplies Plus, Petco"
                  value={excludedKeywords}
                  onChange={(e) => setExcludedKeywords(e.target.value)}
                  data-testid="input-exclude-keywords"
                />
                <p className="text-sm text-muted-foreground">
                  Backend filtering by business name - filters out after API call
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excludedTypes">Exclude Place Types (optional)</Label>
                <Input
                  id="excludedTypes"
                  placeholder="e.g., pet_store, shopping_mall, department_store"
                  value={excludedTypes}
                  onChange={(e) => setExcludedTypes(e.target.value)}
                  data-testid="input-exclude-types"
                />
                <p className="text-sm text-muted-foreground">
                  API-level filtering by place type - saves API credits by excluding before fetching results
                </p>
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
