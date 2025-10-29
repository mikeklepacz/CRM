import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, CheckCircle2, XCircle, Search, Link as LinkIcon, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ParsedStore {
  rawText: string;
  name: string;
  city: string;
  state: string;
  address: string;
  phone: string;
}

interface MatchedStore {
  parsed: ParsedStore;
  match: {
    name: string;
    link: string;
    city: string;
    state: string;
    address: string;
    phone: string;
  };
  confidence: number;
}

interface GoogleVerifiedStore {
  parsed: ParsedStore;
  googleResult: {
    place_id: string;
    name: string;
    fullAddress: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    website: string;
    rating?: number;
    user_ratings_total?: number;
  };
}

interface ParseLocationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeSheetId: string | undefined;
  onStoresSelected: (stores: any[]) => void;
}

export function ParseLocationsDialog({ 
  open, 
  onOpenChange, 
  storeSheetId,
  onStoresSelected 
}: ParseLocationsDialogProps) {
  const [rawText, setRawText] = useState("");
  const [matchedStores, setMatchedStores] = useState<MatchedStore[]>([]);
  const [googleVerifiedStores, setGoogleVerifiedStores] = useState<GoogleVerifiedStore[]>([]);
  const [unmatchedStores, setUnmatchedStores] = useState<ParsedStore[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set());
  const [selectedGoogleStores, setSelectedGoogleStores] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<{ total: number; matched: number; unmatched: number; googleVerified: number } | null>(null);
  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
  const { toast } = useToast();

  const parseAndMatchMutation = useMutation({
    mutationFn: async () => {
      if (!storeSheetId) {
        throw new Error("Store sheet ID is required");
      }
      return await apiRequest('POST', '/api/stores/parse-and-match', {
        rawText,
        sheetId: storeSheetId,
      });
    },
    onSuccess: async (data) => {
      setMatchedStores(data.matched || []);
      setUnmatchedStores(data.unmatched || []);
      
      // Auto-select all database matches
      const autoSelected = new Set<string>();
      data.matched?.forEach((m: MatchedStore) => {
        autoSelected.add(m.match.link);
      });
      setSelectedMatches(autoSelected);

      // Auto-search Google for unmatched entries
      if (data.unmatched && data.unmatched.length > 0) {
        setIsSearchingGoogle(true);
        
        try {
          const googleResults: GoogleVerifiedStore[] = [];
          const stillUnmatched: ParsedStore[] = [];

          for (const unmatchedStore of data.unmatched) {
            try {
              const googleSearchResult = await apiRequest('POST', '/api/stores/search-google', {
                name: unmatchedStore.name,
                address: unmatchedStore.address,
                city: unmatchedStore.city,
                state: unmatchedStore.state,
              });

              if (googleSearchResult.results && googleSearchResult.results.length > 0) {
                // Take the first result as the best match
                googleResults.push({
                  parsed: unmatchedStore,
                  googleResult: googleSearchResult.results[0],
                });
              } else {
                stillUnmatched.push(unmatchedStore);
              }
            } catch (error) {
              console.error('Error searching Google for:', unmatchedStore.name, error);
              stillUnmatched.push(unmatchedStore);
            }
          }

          setGoogleVerifiedStores(googleResults);
          setUnmatchedStores(stillUnmatched);
          
          // Auto-select all Google-verified stores
          const autoSelectedGoogle = new Set<string>();
          googleResults.forEach((g) => {
            autoSelectedGoogle.add(g.googleResult.place_id);
          });
          setSelectedGoogleStores(autoSelectedGoogle);

          setSummary({
            total: data.summary.total,
            matched: data.summary.matched,
            googleVerified: googleResults.length,
            unmatched: stillUnmatched.length,
          });

          toast({
            title: "Parsing Complete",
            description: `Found ${data.summary.matched} database matches and ${googleResults.length} Google-verified locations`,
          });
        } catch (error) {
          console.error('Error during Google search:', error);
          setSummary(data.summary || null);
          
          toast({
            title: "Parsing Complete",
            description: `Found ${data.summary.matched} matches. Google search failed.`,
          });
        } finally {
          setIsSearchingGoogle(false);
        }
      } else {
        setSummary({
          total: data.summary.total,
          matched: data.summary.matched,
          googleVerified: 0,
          unmatched: 0,
        });
        
        toast({
          title: "Parsing Complete",
          description: `Found ${data.summary.matched} matches out of ${data.summary.total} entries`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Parsing Failed",
        description: error.message || "Failed to parse and match stores",
        variant: "destructive",
      });
    },
  });

  const searchStoresMutation = useMutation({
    mutationFn: async (query: string) => {
      if (!storeSheetId) throw new Error("Store sheet ID is required");
      return await apiRequest('POST', '/api/stores/search', {
        query,
        sheetId: storeSheetId,
      });
    },
    onSuccess: (data) => {
      setSearchResults(data.stores || []);
    },
  });

  const manualLinkMutation = useMutation({
    mutationFn: async ({ unmatchedIndex, storeLink }: { unmatchedIndex: number; storeLink: string }) => {
      const unmatched = unmatchedStores[unmatchedIndex];
      const linkedStore = searchResults.find(s => s.link === storeLink);
      if (!linkedStore) throw new Error("Store not found");
      
      // Move from unmatched to matched
      const newMatch: MatchedStore = {
        parsed: unmatched,
        match: linkedStore,
        confidence: 100, // Manual link = 100% confidence
      };
      
      return newMatch;
    },
    onSuccess: (newMatch, { unmatchedIndex }) => {
      // Add to matched stores
      setMatchedStores(prev => [...prev, newMatch]);
      
      // Remove from unmatched stores
      setUnmatchedStores(prev => prev.filter((_, idx) => idx !== unmatchedIndex));
      
      // Auto-select the newly matched store
      setSelectedMatches(prev => new Set(prev).add(newMatch.match.link));
      
      // Update summary
      setSummary(prev => prev ? {
        ...prev,
        matched: prev.matched + 1,
        unmatched: prev.unmatched - 1,
      } : null);
      
      // Close search
      setSearchingIndex(null);
      setSearchQuery("");
      setSearchResults([]);
      
      toast({
        title: "Store Linked",
        description: "Successfully linked store manually",
      });
    },
  });

  const importAsNewMutation = useMutation({
    mutationFn: async (unmatchedIndex: number) => {
      if (!storeSheetId) throw new Error("Store sheet ID is required");
      const unmatched = unmatchedStores[unmatchedIndex];
      
      return await apiRequest('POST', '/api/stores/import-new', {
        store: unmatched,
        sheetId: storeSheetId,
      });
    },
    onSuccess: (data, unmatchedIndex) => {
      // Remove from unmatched stores
      setUnmatchedStores(prev => prev.filter((_, idx) => idx !== unmatchedIndex));
      
      // Update summary
      setSummary(prev => prev ? {
        ...prev,
        unmatched: prev.unmatched - 1,
      } : null);
      
      toast({
        title: "Store Imported",
        description: "Successfully added new store to database",
      });
    },
  });

  const handleSearch = (index: number, query: string) => {
    setSearchQuery(query);
    if (query.trim().length >= 2) {
      searchStoresMutation.mutate(query);
    } else {
      setSearchResults([]);
    }
  };

  const handleToggleMatch = (link: string) => {
    const newSelected = new Set(selectedMatches);
    if (newSelected.has(link)) {
      newSelected.delete(link);
    } else {
      newSelected.add(link);
    }
    setSelectedMatches(newSelected);
  };

  const handleAddSelected = () => {
    // Get selected database matches
    const selectedDbStores = matchedStores
      .filter(m => selectedMatches.has(m.match.link))
      .map(m => ({ ...m.match, source: 'database' }));
    
    // Get selected Google-verified stores (need to create pseudo-links)
    const selectedGoogleStoresList = googleVerifiedStores
      .filter(g => selectedGoogleStores.has(g.googleResult.place_id))
      .map(g => ({
        name: g.googleResult.name,
        link: g.googleResult.place_id, // Use place_id as temporary identifier
        city: g.googleResult.city,
        state: g.googleResult.state,
        address: g.googleResult.address,
        phone: g.googleResult.phone,
        zip: g.googleResult.zip,
        source: 'google',
      }));
    
    const allSelected = [...selectedDbStores, ...selectedGoogleStoresList];
    onStoresSelected(allSelected);
    
    // Reset and close
    setRawText("");
    setMatchedStores([]);
    setGoogleVerifiedStores([]);
    setUnmatchedStores([]);
    setSelectedMatches(new Set());
    setSelectedGoogleStores(new Set());
    setSummary(null);
    onOpenChange(false);
  };

  const handleClose = () => {
    // Reset state
    setRawText("");
    setMatchedStores([]);
    setGoogleVerifiedStores([]);
    setUnmatchedStores([]);
    setSelectedMatches(new Set());
    setSelectedGoogleStores(new Set());
    setSummary(null);
    onOpenChange(false);
  };

  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 80) return "default";
    if (confidence >= 60) return "secondary";
    return "outline";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return "High";
    if (confidence >= 60) return "Medium";
    return "Low";
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Parse Store Locations</DialogTitle>
          <DialogDescription>
            Paste a list of store locations (with addresses and phone numbers) to automatically find matches in your database
          </DialogDescription>
        </DialogHeader>

        {!summary ? (
          // Step 1: Paste and Parse
          <div className="flex flex-col gap-4 flex-1">
            <div className="space-y-2">
              <label className="text-sm font-medium">Paste Store List</label>
              <Textarea
                data-testid="textarea-raw-store-list"
                placeholder="Paste store information here (e.g., names, addresses, phone numbers)..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                data-testid="button-cancel-parse"
              >
                Cancel
              </Button>
              <Button
                onClick={() => parseAndMatchMutation.mutate()}
                disabled={!rawText.trim() || parseAndMatchMutation.isPending}
                data-testid="button-find-matches"
              >
                {parseAndMatchMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Finding Matches...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Find Matches
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Step 2: Show Results
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Summary */}
            <div className="flex items-center gap-4 p-3 bg-muted rounded-md">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">{summary.matched} Database Match</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                <span className="font-medium">{summary.googleVerified} From Google</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium">{summary.unmatched} Unmatched</span>
              </div>
              <div className="ml-auto text-sm text-muted-foreground">
                Total: {summary.total}
              </div>
              {isSearchingGoogle && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching Google...
                </div>
              )}
            </div>

            {/* Matched Stores */}
            {matchedStores.length > 0 && (
              <div className="flex flex-col gap-2 flex-1 overflow-hidden">
                <h3 className="text-sm font-semibold">Matched Stores ({matchedStores.length})</h3>
                <ScrollArea className="flex-1 border rounded-md">
                  <div className="p-4 space-y-3">
                    {matchedStores.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 border rounded-md hover-elevate"
                        data-testid={`matched-store-${idx}`}
                      >
                        <Checkbox
                          checked={selectedMatches.has(item.match.link)}
                          onCheckedChange={() => handleToggleMatch(item.match.link)}
                          data-testid={`checkbox-match-${idx}`}
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.match.name}</span>
                            <Badge variant={getConfidenceBadgeVariant(item.confidence)}>
                              {getConfidenceLabel(item.confidence)} ({item.confidence}%)
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {item.match.address && <div>{item.match.address}</div>}
                            <div>{item.match.city}, {item.match.state}</div>
                            {item.match.phone && <div>{item.match.phone}</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Google-Verified Stores */}
            {googleVerifiedStores.length > 0 && (
              <div className="flex flex-col gap-2 flex-1 overflow-hidden">
                <h3 className="text-sm font-semibold text-blue-600">Google-Verified Stores ({googleVerifiedStores.length})</h3>
                <ScrollArea className="flex-1 border rounded-md">
                  <div className="p-4 space-y-3">
                    {googleVerifiedStores.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 border rounded-md hover-elevate bg-blue-50 dark:bg-blue-950/20"
                        data-testid={`google-store-${idx}`}
                      >
                        <Checkbox
                          checked={selectedGoogleStores.has(item.googleResult.place_id)}
                          onCheckedChange={() => {
                            const newSelected = new Set(selectedGoogleStores);
                            if (newSelected.has(item.googleResult.place_id)) {
                              newSelected.delete(item.googleResult.place_id);
                            } else {
                              newSelected.add(item.googleResult.place_id);
                            }
                            setSelectedGoogleStores(newSelected);
                          }}
                          data-testid={`checkbox-google-${idx}`}
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <div className="font-semibold text-base">{item.googleResult.name}</div>
                              {item.parsed.name !== item.googleResult.name && (
                                <div className="text-xs text-muted-foreground italic">
                                  (Searched for: "{item.parsed.name}")
                                </div>
                              )}
                            </div>
                            <Badge variant="default" className="bg-blue-600 shrink-0">
                              From Google
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-0.5">
                            <div className="font-medium">{item.googleResult.fullAddress}</div>
                            {item.googleResult.phone && <div>📞 {item.googleResult.phone}</div>}
                            {item.googleResult.website && (
                              <div className="truncate">
                                🌐 <a href={item.googleResult.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 dark:text-blue-400">
                                  {item.googleResult.website}
                                </a>
                              </div>
                            )}
                            {item.googleResult.rating && (
                              <div className="flex items-center gap-1 mt-1">
                                <span>⭐ {item.googleResult.rating}</span>
                                {item.googleResult.user_ratings_total && (
                                  <span className="text-xs">({item.googleResult.user_ratings_total} reviews)</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Unmatched Stores */}
            {unmatchedStores.length > 0 && (
              <div className="flex flex-col gap-2 flex-1 overflow-hidden min-h-0">
                <h3 className="text-sm font-semibold text-red-600">Unmatched Entries ({unmatchedStores.length})</h3>
                <ScrollArea className="flex-1 border rounded-md">
                  <div className="p-4 space-y-3">
                    {unmatchedStores.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 border rounded-md bg-muted/50"
                        data-testid={`unmatched-store-${idx}`}
                      >
                        {item.name && <div className="font-medium mb-1">{item.name}</div>}
                        <div className="text-sm text-muted-foreground space-y-0.5 mb-2">
                          {item.address && <div>{item.address}</div>}
                          {item.city && item.state && (
                            <div>{item.city}, {item.state}</div>
                          )}
                          {item.phone && <div>{item.phone}</div>}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (searchingIndex === idx) {
                                setSearchingIndex(null);
                                setSearchQuery("");
                                setSearchResults([]);
                              } else {
                                setSearchingIndex(idx);
                                setSearchQuery("");
                                setSearchResults([]);
                              }
                            }}
                            data-testid={`button-search-${idx}`}
                          >
                            <Search className="h-3 w-3 mr-1" />
                            {searchingIndex === idx ? "Cancel Search" : "Search Database"}
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => importAsNewMutation.mutate(idx)}
                            disabled={importAsNewMutation.isPending}
                            data-testid={`button-import-${idx}`}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Import as New
                          </Button>
                        </div>
                        
                        {/* Search Section */}
                        {searchingIndex === idx && (
                          <div className="mt-3 pt-3 border-t space-y-2">
                            <Input
                              placeholder="Search by name, address, city..."
                              value={searchQuery}
                              onChange={(e) => handleSearch(idx, e.target.value)}
                              autoFocus
                              data-testid={`input-search-${idx}`}
                            />
                            
                            {searchStoresMutation.isPending && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Searching...
                              </div>
                            )}
                            
                            {searchResults.length > 0 && (
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                {searchResults.map((result) => (
                                  <div
                                    key={result.link}
                                    className="flex items-start justify-between gap-2 p-2 border rounded hover-elevate text-sm"
                                    data-testid={`search-result-${result.link}`}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{result.name}</div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        {result.city}, {result.state}
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={() => manualLinkMutation.mutate({ unmatchedIndex: idx, storeLink: result.link })}
                                      disabled={manualLinkMutation.isPending}
                                      data-testid={`button-link-${result.link}`}
                                    >
                                      <LinkIcon className="h-3 w-3 mr-1" />
                                      Link
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {searchQuery.length >= 2 && !searchStoresMutation.isPending && searchResults.length === 0 && (
                              <div className="text-sm text-muted-foreground py-2">
                                No matching stores found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between gap-2 pt-2 border-t">
              <Button
                variant="outline"
                onClick={handleClose}
                data-testid="button-cancel-results"
              >
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMatchedStores([]);
                    setGoogleVerifiedStores([]);
                    setUnmatchedStores([]);
                    setSelectedMatches(new Set());
                    setSelectedGoogleStores(new Set());
                    setSummary(null);
                  }}
                  data-testid="button-start-over"
                >
                  Start Over
                </Button>
                <Button
                  onClick={handleAddSelected}
                  disabled={selectedMatches.size === 0 && selectedGoogleStores.size === 0}
                  data-testid="button-add-selected"
                >
                  Add Selected ({selectedMatches.size + selectedGoogleStores.size})
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
