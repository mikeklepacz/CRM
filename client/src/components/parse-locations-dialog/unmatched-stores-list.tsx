import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Link as LinkIcon, Plus, Search } from "lucide-react";
import { ParsedStore } from "./types";

interface SearchResult {
  link: string;
  name: string;
  city: string;
  state: string;
}

interface UnmatchedStoresListProps {
  stores: ParsedStore[];
  searchingIndex: number | null;
  searchQuery: string;
  searchResults: SearchResult[];
  searchPending: boolean;
  importPending: boolean;
  linkPending: boolean;
  onToggleSearch: (idx: number) => void;
  onSearchQueryChange: (idx: number, query: string) => void;
  onImportAsNew: (idx: number) => void;
  onManualLink: (unmatchedIndex: number, storeLink: string) => void;
}

export const UnmatchedStoresList = ({
  stores,
  searchingIndex,
  searchQuery,
  searchResults,
  searchPending,
  importPending,
  linkPending,
  onToggleSearch,
  onSearchQueryChange,
  onImportAsNew,
  onManualLink,
}: UnmatchedStoresListProps) => {
  if (stores.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 flex-1 overflow-hidden min-h-0">
      <h3 className="text-sm font-semibold text-red-600">Unmatched Entries ({stores.length})</h3>
      <ScrollArea className="flex-1 border rounded-md">
        <div className="p-4 space-y-3">
          {stores.map((item, idx) => (
            <div key={idx} className="p-3 border rounded-md bg-muted/50" data-testid={`unmatched-store-${idx}`}>
              {item.name && <div className="font-medium mb-1">{item.name}</div>}
              <div className="text-sm text-muted-foreground space-y-0.5 mb-2">
                {item.address && <div>{item.address}</div>}
                {item.city && item.state && (
                  <div>
                    {item.city}, {item.state}
                  </div>
                )}
                {item.phone && <div>{item.phone}</div>}
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onToggleSearch(idx)}
                  data-testid={`button-search-${idx}`}
                >
                  <Search className="h-3 w-3 mr-1" />
                  {searchingIndex === idx ? "Cancel Search" : "Search Database"}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onImportAsNew(idx)}
                  disabled={importPending}
                  data-testid={`button-import-${idx}`}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Import as New
                </Button>
              </div>

              {searchingIndex === idx && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <Input
                    placeholder="Search by name, address, city..."
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(idx, e.target.value)}
                    autoFocus
                    data-testid={`input-search-${idx}`}
                  />

                  {searchPending && (
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
                            onClick={() => onManualLink(idx, result.link)}
                            disabled={linkPending}
                            data-testid={`button-link-${result.link}`}
                          >
                            <LinkIcon className="h-3 w-3 mr-1" />
                            Link
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchQuery.length >= 2 && !searchPending && searchResults.length === 0 && (
                    <div className="text-sm text-muted-foreground py-2">No matching stores found</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
