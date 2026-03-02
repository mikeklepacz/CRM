import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ParseInputStep } from "./parse-locations-dialog/parse-input-step";
import { ResultsView } from "./parse-locations-dialog/results-view";
import { GoogleVerifiedStore, MatchedStore, ParsedStore } from "./parse-locations-dialog/types";
import { verifyUnmatchedWithGoogle } from "./parse-locations-dialog/google-verification";

interface ParseLocationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeSheetId: string | undefined;
  onStoresSelected: (stores: any[]) => void;
  category?: string;
}

export function ParseLocationsDialog({
  open,
  onOpenChange,
  storeSheetId,
  onStoresSelected,
  category,
}: ParseLocationsDialogProps) {
  const [rawText, setRawText] = useState("");
  const [brandName, setBrandName] = useState("");
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

  const resetState = () => {
    setRawText("");
    setMatchedStores([]);
    setGoogleVerifiedStores([]);
    setUnmatchedStores([]);
    setSelectedMatches(new Set());
    setSelectedGoogleStores(new Set());
    setSummary(null);
  };

  const parseAndMatchMutation = useMutation({
    mutationFn: async () => {
      if (!storeSheetId) {
        throw new Error("Store sheet ID is required");
      }
      return apiRequest("POST", "/api/stores/parse-and-match", { rawText, sheetId: storeSheetId });
    },
    onSuccess: async (data) => {
      setMatchedStores(data.matched || []);
      setUnmatchedStores(data.unmatched || []);

      const autoSelected = new Set<string>();
      data.matched?.forEach((m: MatchedStore) => {
        autoSelected.add(m.match.link);
      });
      setSelectedMatches(autoSelected);

      let detectedBrand = brandName;
      if (!detectedBrand && data.brandName) {
        detectedBrand = data.brandName;
        setBrandName(detectedBrand);
      }

      if (data.unmatched && data.unmatched.length > 0) {
        setIsSearchingGoogle(true);

        try {
          const { googleResults, stillUnmatched } = await verifyUnmatchedWithGoogle({
            unmatchedStores: data.unmatched,
            category,
            brandName: detectedBrand,
          });

          setGoogleVerifiedStores(googleResults);
          setUnmatchedStores(stillUnmatched);

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
          console.error("Error during Google search:", error);
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
      return apiRequest("POST", "/api/stores/search", { query, sheetId: storeSheetId });
    },
    onSuccess: (data) => {
      setSearchResults(data.stores || []);
    },
  });

  const manualLinkMutation = useMutation({
    mutationFn: async ({ unmatchedIndex, storeLink }: { unmatchedIndex: number; storeLink: string }) => {
      const unmatched = unmatchedStores[unmatchedIndex];
      const linkedStore = searchResults.find((s) => s.link === storeLink);
      if (!linkedStore) throw new Error("Store not found");
      const newMatch: MatchedStore = { parsed: unmatched, match: linkedStore, confidence: 100 };
      return newMatch;
    },
    onSuccess: (newMatch, { unmatchedIndex }) => {
      setMatchedStores((prev) => [...prev, newMatch]);
      setUnmatchedStores((prev) => prev.filter((_, idx) => idx !== unmatchedIndex));
      setSelectedMatches((prev) => new Set(prev).add(newMatch.match.link));
      setSummary((prev) => (prev ? { ...prev, matched: prev.matched + 1, unmatched: prev.unmatched - 1 } : null));
      setSearchingIndex(null);
      setSearchQuery("");
      setSearchResults([]);
      toast({ title: "Store Linked", description: "Successfully linked store manually" });
    },
  });

  const importAsNewMutation = useMutation({
    mutationFn: async (unmatchedIndex: number) => {
      if (!storeSheetId) throw new Error("Store sheet ID is required");
      const unmatched = unmatchedStores[unmatchedIndex];
      return apiRequest("POST", "/api/stores/import-new", { store: unmatched, sheetId: storeSheetId });
    },
    onSuccess: (_data, unmatchedIndex) => {
      setUnmatchedStores((prev) => prev.filter((_, idx) => idx !== unmatchedIndex));
      setSummary((prev) => (prev ? { ...prev, unmatched: prev.unmatched - 1 } : null));
      toast({ title: "Store Imported", description: "Successfully added new store to database" });
    },
  });

  const handleSearch = (_index: number, query: string) => {
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

  const handleToggleGoogleStore = (placeId: string) => {
    const newSelected = new Set(selectedGoogleStores);
    if (newSelected.has(placeId)) {
      newSelected.delete(placeId);
    } else {
      newSelected.add(placeId);
    }
    setSelectedGoogleStores(newSelected);
  };

  const handleAddSelected = () => {
    const selectedDbStores = matchedStores.filter((m) => selectedMatches.has(m.match.link)).map((m) => ({ ...m.match, source: "database" }));
    const selectedGoogleStoresList = googleVerifiedStores
      .filter((g) => selectedGoogleStores.has(g.googleResult.place_id))
      .map((g) => ({
        name: g.googleResult.name,
        link: g.googleResult.place_id,
        city: g.googleResult.city,
        state: g.googleResult.state,
        address: g.googleResult.address,
        phone: g.googleResult.phone,
        zip: g.googleResult.zip,
        source: "google",
      }));

    onStoresSelected([...selectedDbStores, ...selectedGoogleStoresList]);
    resetState();
    onOpenChange(false);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleStartOver = () => {
    setMatchedStores([]);
    setGoogleVerifiedStores([]);
    setUnmatchedStores([]);
    setSelectedMatches(new Set());
    setSelectedGoogleStores(new Set());
    setSummary(null);
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
          <ParseInputStep
            rawText={rawText}
            isPending={parseAndMatchMutation.isPending}
            onRawTextChange={setRawText}
            onCancel={handleClose}
            onFindMatches={() => parseAndMatchMutation.mutate()}
          />
        ) : (
          <ResultsView
            summary={summary}
            isSearchingGoogle={isSearchingGoogle}
            matchedStores={matchedStores}
            selectedMatches={selectedMatches}
            onToggleMatch={handleToggleMatch}
            googleVerifiedStores={googleVerifiedStores}
            selectedGoogleStores={selectedGoogleStores}
            onToggleGoogleStore={handleToggleGoogleStore}
            unmatchedStores={unmatchedStores}
            searchingIndex={searchingIndex}
            searchQuery={searchQuery}
            searchResults={searchResults}
            searchPending={searchStoresMutation.isPending}
            importPending={importAsNewMutation.isPending}
            linkPending={manualLinkMutation.isPending}
            onToggleSearch={(idx) => {
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
            onSearchQueryChange={handleSearch}
            onImportAsNew={(idx) => importAsNewMutation.mutate(idx)}
            onManualLink={(unmatchedIndex, storeLink) => manualLinkMutation.mutate({ unmatchedIndex, storeLink })}
            onCancel={handleClose}
            onStartOver={handleStartOver}
            onAddSelected={handleAddSelected}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
