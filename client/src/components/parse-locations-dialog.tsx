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
  const [unmatchedStores, setUnmatchedStores] = useState<ParsedStore[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<{ total: number; matched: number; unmatched: number } | null>(null);
  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [verifiedStores, setVerifiedStores] = useState<any[]>([]);
  const [verificationNotFound, setVerificationNotFound] = useState<ParsedStore[]>([]);
  const { toast} = useToast();

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
    onSuccess: (data) => {
      setMatchedStores(data.matched || []);
      setUnmatchedStores(data.unmatched || []);
      setSummary(data.summary || null);
      
      // Auto-select all matches
      const autoSelected = new Set<string>();
      data.matched?.forEach((m: MatchedStore) => {
        autoSelected.add(m.match.link);
      });
      setSelectedMatches(autoSelected);

      toast({
        title: "Parsing Complete",
        description: `Found ${data.summary.matched} matches out of ${data.summary.total} entries`,
      });
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

  const googleVerifyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/stores/google-verify', {
        unmatchedEntries: unmatchedStores,
      });
    },
    onSuccess: (data) => {
      setVerifiedStores(data.verified || []);
      setVerificationNotFound(data.notFound || []);
      
      // Clear unmatched stores since they're now categorized into verified/not-found
      setUnmatchedStores([]);
      
      toast({
        title: "Google Verification Complete",
        description: `Verified ${data.summary.verified} out of ${data.summary.total} entries`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify with Google Maps",
        variant: "destructive",
      });
    },
  });

  const importVerifiedMutation = useMutation({
    mutationFn: async () => {
      if (!storeSheetId) throw new Error("Store sheet ID is required");
      
      // Import all verified stores
      const importPromises = verifiedStores.map(verified =>
        apiRequest('POST', '/api/stores/import-new', {
          store: {
            name: verified.google.name,
            address: verified.google.address,
            city: verified.google.city,
            state: verified.google.state,
            zip: verified.google.zip,
            phone: verified.google.phone,
            website: verified.google.website,
          },
          sheetId: storeSheetId,
        })
      );
      
      return await Promise.all(importPromises);
    },
    onSuccess: (results) => {
      setVerifiedStores([]);
      
      toast({
        title: "Import Complete",
        description: `Successfully imported ${results.length} verified stores`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import verified stores",
        variant: "destructive",
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
    const selectedStores = matchedStores
      .filter(m => selectedMatches.has(m.match.link))
      .map(m => m.match);
    
    onStoresSelected(selectedStores);
    
    // Reset and close
    setRawText("");
    setMatchedStores([]);
    setUnmatchedStores([]);
    setSelectedMatches(new Set());
    setSummary(null);
    onOpenChange(false);
  };

  const handleClose = () => {
    // Reset state
    setRawText("");
    setMatchedStores([]);
    setUnmatchedStores([]);
    setSelectedMatches(new Set());
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
                <span className="font-medium">{summary.matched} Matched</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium">{summary.unmatched} Unmatched</span>
              </div>
              <div className="ml-auto text-sm text-muted-foreground">
                Total: {summary.total}
              </div>
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

            {/* Google Verified Stores */}
            {verifiedStores.length > 0 && (
              <div className="flex flex-col gap-2 flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-green-600">Google Verified ({verifiedStores.length})</h3>
                  <Button
                    size="sm"
                    onClick={() => importVerifiedMutation.mutate()}
                    disabled={importVerifiedMutation.isPending}
                    data-testid="button-import-all-verified"
                  >
                    {importVerifiedMutation.isPending ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3 mr-1" />
                        Import All Verified
                      </>
                    )}
                  </Button>
                </div>
                <ScrollArea className="flex-1 border rounded-md">
                  <div className="p-4 space-y-3">
                    {verifiedStores.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 border rounded-md bg-green-50 dark:bg-green-950/20"
                        data-testid={`verified-store-${idx}`}
                      >
                        <div className="font-medium mb-1">{item.google.name}</div>
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          <div>{item.google.address}</div>
                          <div>{item.google.city}, {item.google.state} {item.google.zip}</div>
                          {item.google.phone && <div>{item.google.phone}</div>}
                          {item.google.rating && (
                            <div className="text-xs">
                              ⭐ {item.google.rating} ({item.google.reviews} reviews)
                            </div>
                          )}
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
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-red-600">Unmatched Entries ({unmatchedStores.length})</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => googleVerifyMutation.mutate()}
                    disabled={googleVerifyMutation.isPending}
                    data-testid="button-google-verify"
                  >
                    {googleVerifyMutation.isPending ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Select All & Google Verify"
                    )}
                  </Button>
                </div>
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
                    setUnmatchedStores([]);
                    setSelectedMatches(new Set());
                    setSummary(null);
                  }}
                  data-testid="button-start-over"
                >
                  Start Over
                </Button>
                <Button
                  onClick={handleAddSelected}
                  disabled={selectedMatches.size === 0}
                  data-testid="button-add-selected"
                >
                  Add Selected ({selectedMatches.size})
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
