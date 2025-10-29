import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, CheckCircle2, XCircle } from "lucide-react";
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
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
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

            {/* Unmatched Stores */}
            {unmatchedStores.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-red-600">Unmatched Entries ({unmatchedStores.length})</h3>
                <ScrollArea className="max-h-32 border rounded-md">
                  <div className="p-4 space-y-2">
                    {unmatchedStores.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2 text-sm bg-muted/50 rounded"
                        data-testid={`unmatched-store-${idx}`}
                      >
                        {item.name && <div className="font-medium">{item.name}</div>}
                        {item.city && item.state && (
                          <div className="text-muted-foreground">{item.city}, {item.state}</div>
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
