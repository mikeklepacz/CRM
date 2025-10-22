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
import { useToast } from "@/hooks/use-toast";
import { Search, MapPin, Phone, Globe, Plus, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

export default function MapSearch() {
  const { toast } = useToast();
  const [businessType, setBusinessType] = useState("");
  const [city, setCity] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);

  const { data: categoriesData } = useQuery<{ categories: Category[] }>({
    queryKey: ["/api/categories/active"],
  });

  const searchMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/maps/search", {
        method: "POST",
        body: JSON.stringify({
          query: businessType,
          location: city,
        }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      setSearchResults(data.results || []);
      if (!data.results || data.results.length === 0) {
        toast({
          title: "No results found",
          description: "Try adjusting your search terms",
        });
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
      const response = await apiRequest("/api/maps/save-to-sheet", {
        method: "POST",
        body: JSON.stringify({ placeId, category }),
      });
      return response.json();
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
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search Businesses</CardTitle>
            <CardDescription>
              Find local businesses using Google Maps and add them to your database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type</Label>
                  <Input
                    id="businessType"
                    placeholder="e.g., pet store, dispensary"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    data-testid="input-business-type"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City (Optional)</Label>
                  <Input
                    id="city"
                    placeholder="e.g., New York, Los Angeles"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    data-testid="input-city"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
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
              <CardTitle>Search Results ({searchResults.length})</CardTitle>
              <CardDescription>
                Click "Add to Database" to save a business to your Store Database sheet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((place) => {
                      const { city: placeCity, state: placeState } = parseCityState(place.formatted_address);
                      return (
                        <TableRow key={place.place_id} data-testid={`row-place-${place.place_id}`}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{place.name}</span>
                              {place.rating && (
                                <span className="text-sm text-muted-foreground">
                                  ⭐ {place.rating} ({place.user_ratings_total} reviews)
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {place.formatted_address}
                          </TableCell>
                          <TableCell>{placeCity}</TableCell>
                          <TableCell>{placeState}</TableCell>
                          <TableCell>
                            {place.business_status === 'OPERATIONAL' ? (
                              <Badge variant="default">Open</Badge>
                            ) : place.business_status === 'CLOSED_TEMPORARILY' ? (
                              <Badge variant="secondary">Temp Closed</Badge>
                            ) : place.business_status === 'CLOSED_PERMANENTLY' ? (
                              <Badge variant="destructive">Closed</Badge>
                            ) : (
                              <Badge variant="outline">Unknown</Badge>
                            )}
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
