import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp, Search, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SearchHistory } from "@shared/schema";

interface SearchHistoryProps {
  onSearchAgain: (businessType: string, city: string, state: string, country: string, excludedKeywords?: string[] | null, excludedTypes?: string[] | null) => void;
}

export function SearchHistoryComponent({ onSearchAgain }: SearchHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterText, setFilterText] = useState("");

  const { data: historyData, isLoading } = useQuery<{ history: SearchHistory[] }>({
    queryKey: ["/api/maps/search-history"],
  });

  const history = historyData?.history || [];
  
  // Filter history by business type
  const filteredHistory = history.filter((item) =>
    item.businessType.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <Card>
      <CardHeader 
        className="cursor-pointer hover-elevate active-elevate-2" 
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="header-search-history"
      >
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search History
              <span className="text-sm font-normal text-muted-foreground">
                ({history.length} {history.length === 1 ? 'search' : 'searches'})
              </span>
            </CardTitle>
            <CardDescription>
              Global history of all Map Search queries
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" data-testid="button-toggle-history">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading history...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No search history yet. Perform a search to see it here.
            </div>
          ) : (
            <>
              <div className="mb-4">
                <Input
                  placeholder="Filter by business type..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="max-w-sm"
                  data-testid="input-filter-history"
                />
              </div>

              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Business Type</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Excluded Keywords</TableHead>
                      <TableHead>Excluded Types</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No results found for "{filterText}"
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHistory.map((item) => (
                        <TableRow key={item.id} data-testid={`row-history-${item.id}`}>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onSearchAgain(
                                item.businessType,
                                item.city,
                                item.state,
                                item.country,
                                item.excludedKeywords,
                                item.excludedTypes
                              )}
                              data-testid={`button-search-again-${item.id}`}
                            >
                              <RotateCcw className="mr-1 h-3 w-3" />
                              Search Again
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">{item.businessType}</TableCell>
                          <TableCell>{item.city}</TableCell>
                          <TableCell>{item.state}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {item.excludedKeywords && item.excludedKeywords.length > 0 
                              ? item.excludedKeywords.join(', ') 
                              : <span className="text-muted-foreground/50">None</span>
                            }
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {item.excludedTypes && item.excludedTypes.length > 0 
                              ? item.excludedTypes.join(', ') 
                              : <span className="text-muted-foreground/50">None</span>
                            }
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
