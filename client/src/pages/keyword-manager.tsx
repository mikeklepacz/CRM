import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Trash2, Filter, SortAsc, SortDesc } from "lucide-react";

export default function KeywordManager() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [minFrequency, setMinFrequency] = useState(1);
  const [maxFrequency, setMaxFrequency] = useState(Infinity);
  const [sortBy, setSortBy] = useState<'keyword' | 'frequency'>('frequency');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Fetch sheets
  const { data: sheets } = useQuery<any>({
    queryKey: ["/api/sheets"],
  });

  const storeSheetId = sheets?.sheets?.find((s: any) => s.sheetPurpose === "Store Database")?.id;
  const trackerSheetId = sheets?.sheets?.find((s: any) => s.sheetPurpose === "Commission Tracker")?.id;

  // Fetch keyword statistics
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["/api/sheets/keyword-stats", storeSheetId, trackerSheetId],
    enabled: !!storeSheetId && !!trackerSheetId,
    queryFn: async () => {
      const response = await fetch('/api/sheets/keyword-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeSheetId,
          trackerSheetId,
          joinColumn: 'link',
        }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch keyword stats');
      return response.json();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ keywordsToDelete, tagsToDelete }: { keywordsToDelete?: string[], tagsToDelete?: string[] }) => {
      return await apiRequest('/api/sheets/delete-keywords', 'POST', {
        storeSheetId,
        trackerSheetId,
        keywordsToDelete,
        tagsToDelete,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Deleted ${data.deletedKeywords} keywords and ${data.deletedTags} tags from ${data.updatedCells} cells`,
      });
      setSelectedKeywords(new Set());
      setSelectedTags(new Set());
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete items",
        variant: "destructive",
      });
    },
  });

  // Filter and sort keywords
  const filteredKeywords = useMemo(() => {
    if (!stats?.keywords) return [];
    
    let filtered = stats.keywords.filter((kw: any) => 
      kw.keyword.toLowerCase().includes(searchTerm.toLowerCase()) &&
      kw.count >= minFrequency &&
      (maxFrequency === Infinity || kw.count <= maxFrequency)
    );

    filtered.sort((a: any, b: any) => {
      const aVal = sortBy === 'keyword' ? a.keyword : a.count;
      const bVal = sortBy === 'keyword' ? b.keyword : b.count;
      
      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [stats?.keywords, searchTerm, minFrequency, maxFrequency, sortBy, sortDirection]);

  // Filter and sort tags
  const filteredTags = useMemo(() => {
    if (!stats?.tags) return [];
    
    let filtered = stats.tags.filter((tag: any) => 
      tag.tag.toLowerCase().includes(searchTerm.toLowerCase()) &&
      tag.count >= minFrequency &&
      (maxFrequency === Infinity || tag.count <= maxFrequency)
    );

    filtered.sort((a: any, b: any) => {
      const aVal = sortBy === 'keyword' ? a.tag : a.count;
      const bVal = sortBy === 'keyword' ? b.tag : b.count;
      
      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [stats?.tags, searchTerm, minFrequency, maxFrequency, sortBy, sortDirection]);

  const toggleKeyword = (keyword: string) => {
    const newSelected = new Set(selectedKeywords);
    if (newSelected.has(keyword)) {
      newSelected.delete(keyword);
    } else {
      newSelected.add(keyword);
    }
    setSelectedKeywords(newSelected);
  };

  const toggleTag = (tag: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(tag)) {
      newSelected.delete(tag);
    } else {
      newSelected.add(tag);
    }
    setSelectedTags(newSelected);
  };

  const selectByThreshold = (threshold: number, type: 'keywords' | 'tags') => {
    if (type === 'keywords') {
      const toSelect = filteredKeywords
        .filter((kw: any) => kw.count <= threshold)
        .map((kw: any) => kw.keyword);
      setSelectedKeywords(new Set(toSelect));
    } else {
      const toSelect = filteredTags
        .filter((tag: any) => tag.count <= threshold)
        .map((tag: any) => tag.tag);
      setSelectedTags(new Set(toSelect));
    }
  };

  const handleDelete = (type: 'keywords' | 'tags') => {
    if (type === 'keywords' && selectedKeywords.size === 0) {
      toast({
        title: "No Keywords Selected",
        description: "Please select keywords to delete",
        variant: "destructive",
      });
      return;
    }
    
    if (type === 'tags' && selectedTags.size === 0) {
      toast({
        title: "No Tags Selected",
        description: "Please select tags to delete",
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Are you sure you want to delete ${type === 'keywords' ? selectedKeywords.size : selectedTags.size} ${type} from your Google Sheets? This action cannot be undone.`)) {
      deleteMutation.mutate({
        keywordsToDelete: type === 'keywords' ? Array.from(selectedKeywords) : undefined,
        tagsToDelete: type === 'tags' ? Array.from(selectedTags) : undefined,
      });
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only administrators can access the Keyword Manager.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Keyword & Tag Manager</CardTitle>
          <CardDescription>
            Review and clean up keywords and tags from your dataset. Remove low-frequency items to improve filtering performance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="keywords" className="space-y-4">
            <TabsList>
              <TabsTrigger value="keywords" data-testid="tab-keywords">
                Keywords ({stats?.keywords?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="tags" data-testid="tab-tags">
                Tags ({stats?.tags?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="keywords" className="space-y-4">
              {/* Controls */}
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label>Search Keywords</Label>
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-keywords"
                  />
                </div>
                <div>
                  <Label>Min Frequency</Label>
                  <Input
                    type="number"
                    min="1"
                    value={minFrequency}
                    onChange={(e) => setMinFrequency(parseInt(e.target.value) || 1)}
                    className="w-24"
                    data-testid="input-min-frequency"
                  />
                </div>
                <div>
                  <Label>Max Frequency</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="∞"
                    value={maxFrequency === Infinity ? '' : maxFrequency}
                    onChange={(e) => setMaxFrequency(e.target.value ? parseInt(e.target.value) : Infinity)}
                    className="w-24"
                    data-testid="input-max-frequency"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSortBy(sortBy === 'keyword' ? 'frequency' : 'keyword');
                  }}
                  data-testid="button-toggle-sort"
                >
                  {sortBy === 'keyword' ? 'Sort by Frequency' : 'Sort by Name'}
                  {sortDirection === 'asc' ? <SortAsc className="ml-2 h-4 w-4" /> : <SortDesc className="ml-2 h-4 w-4" />}
                </Button>
              </div>

              {/* Bulk Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectByThreshold(5, 'keywords')}
                  data-testid="button-select-below-5"
                >
                  Select ≤5 uses
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectByThreshold(10, 'keywords')}
                  data-testid="button-select-below-10"
                >
                  Select ≤10 uses
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedKeywords(new Set())}
                  data-testid="button-clear-selection"
                >
                  Clear Selection
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete('keywords')}
                  disabled={selectedKeywords.size === 0 || deleteMutation.isPending}
                  data-testid="button-delete-selected"
                >
                  {deleteMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
                  ) : (
                    <><Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedKeywords.size})</>
                  )}
                </Button>
              </div>

              {/* Table */}
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  <p className="mt-2 text-muted-foreground">Loading keywords...</p>
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <span className="sr-only">Select</span>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => { setSortBy('keyword'); setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); }}>
                          Keyword
                        </TableHead>
                        <TableHead className="cursor-pointer text-right" onClick={() => { setSortBy('frequency'); setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); }}>
                          Frequency
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredKeywords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No keywords found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredKeywords.map((kw: any) => (
                          <TableRow key={kw.keyword} data-testid={`row-keyword-${kw.keyword}`}>
                            <TableCell>
                              <Checkbox
                                checked={selectedKeywords.has(kw.keyword)}
                                onCheckedChange={() => toggleKeyword(kw.keyword)}
                                data-testid={`checkbox-${kw.keyword}`}
                              />
                            </TableCell>
                            <TableCell>{kw.keyword}</TableCell>
                            <TableCell className="text-right">{kw.count}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Showing {filteredKeywords.length} of {stats?.keywords?.length || 0} keywords
              </p>
            </TabsContent>

            <TabsContent value="tags" className="space-y-4">
              {/* Controls */}
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label>Search Tags</Label>
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-tags"
                  />
                </div>
                <div>
                  <Label>Min Frequency</Label>
                  <Input
                    type="number"
                    min="1"
                    value={minFrequency}
                    onChange={(e) => setMinFrequency(parseInt(e.target.value) || 1)}
                    className="w-24"
                  />
                </div>
                <div>
                  <Label>Max Frequency</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="∞"
                    value={maxFrequency === Infinity ? '' : maxFrequency}
                    onChange={(e) => setMaxFrequency(e.target.value ? parseInt(e.target.value) : Infinity)}
                    className="w-24"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSortBy(sortBy === 'keyword' ? 'frequency' : 'keyword');
                  }}
                >
                  {sortBy === 'keyword' ? 'Sort by Frequency' : 'Sort by Name'}
                  {sortDirection === 'asc' ? <SortAsc className="ml-2 h-4 w-4" /> : <SortDesc className="ml-2 h-4 w-4" />}
                </Button>
              </div>

              {/* Bulk Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectByThreshold(5, 'tags')}
                >
                  Select ≤5 uses
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectByThreshold(10, 'tags')}
                >
                  Select ≤10 uses
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTags(new Set())}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete('tags')}
                  disabled={selectedTags.size === 0 || deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
                  ) : (
                    <><Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedTags.size})</>
                  )}
                </Button>
              </div>

              {/* Table */}
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  <p className="mt-2 text-muted-foreground">Loading tags...</p>
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <span className="sr-only">Select</span>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => { setSortBy('keyword'); setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); }}>
                          Tag
                        </TableHead>
                        <TableHead className="cursor-pointer text-right" onClick={() => { setSortBy('frequency'); setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); }}>
                          Frequency
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTags.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No tags found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTags.map((tag: any) => (
                          <TableRow key={tag.tag} data-testid={`row-tag-${tag.tag}`}>
                            <TableCell>
                              <Checkbox
                                checked={selectedTags.has(tag.tag)}
                                onCheckedChange={() => toggleTag(tag.tag)}
                              />
                            </TableCell>
                            <TableCell>{tag.tag}</TableCell>
                            <TableCell className="text-right">{tag.count}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Showing {filteredTags.length} of {stats?.tags?.length || 0} tags
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
