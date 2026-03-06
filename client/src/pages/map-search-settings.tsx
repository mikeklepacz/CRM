import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useOptionalProject } from "@/contexts/project-context";
import type { SearchHistory, SavedExclusion } from "@shared/schema";

export default function MapSearchSettings() {
  const { toast } = useToast();
  const projectContext = useOptionalProject();
  const currentProject = projectContext?.currentProject;
  const searchHistoryUrl = currentProject?.id
    ? `/api/maps/search-history?projectId=${currentProject.id}`
    : "/api/maps/search-history";

  // Fetch search history
  const { data: historyData, isLoading: historyLoading } = useQuery<{ history: SearchHistory[] }>({
    queryKey: [searchHistoryUrl],
  });

  // Fetch saved exclusions (project-specific)
  const exclusionsUrl = currentProject?.id 
    ? `/api/exclusions?projectId=${currentProject.id}` 
    : "/api/exclusions";
  const { data: exclusionsData, isLoading: exclusionsLoading } = useQuery<{ exclusions: SavedExclusion[] }>({
    queryKey: [exclusionsUrl],
  });

  // Delete search history mutation
  const deleteHistoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/maps/search-history/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [searchHistoryUrl] });
      toast({
        title: "Deleted",
        description: "Search history entry removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete search history",
      });
    },
  });

  // Delete exclusion mutation
  const deleteExclusionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/exclusions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [exclusionsUrl] });
      toast({
        title: "Deleted",
        description: "Exclusion removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete exclusion",
      });
    },
  });

  const searchHistory = historyData?.history || [];
  const exclusions = exclusionsData?.exclusions || [];
  const keywords = exclusions.filter(e => e.type === 'keyword');
  const placeTypes = exclusions.filter(e => e.type === 'place_type');

  return (
    <div className="h-screen overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-4">
          <Link href="/map-search">
            <Button variant="ghost" size="sm" data-testid="button-back-to-search">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Map Search
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Map Search Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your search history and saved exclusions</p>
          </div>
        </div>

        {/* Business Type History */}
        <Card>
          <CardHeader>
            <CardTitle>Business Type History</CardTitle>
            <CardDescription>
              Previously searched business types (sorted by popularity)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : searchHistory.length === 0 ? (
              <p className="text-muted-foreground">No search history yet</p>
            ) : (
              <div className="space-y-2">
                {searchHistory
                  .sort((a, b) => b.searchCount - a.searchCount)
                  .map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 rounded-md border"
                      data-testid={`history-entry-${entry.id}`}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{entry.businessType}</div>
                        <div className="text-sm text-muted-foreground">
                          {entry.city && entry.state
                            ? `${entry.city}, ${entry.state}${entry.country ? `, ${entry.country}` : ''}`
                            : entry.state || entry.country || 'No location'}
                          {' · '}
                          Searched {entry.searchCount} {entry.searchCount === 1 ? 'time' : 'times'}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteHistoryMutation.mutate(entry.id)}
                        disabled={deleteHistoryMutation.isPending}
                        data-testid={`button-delete-history-${entry.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Saved Keywords */}
        <Card>
          <CardHeader>
            <CardTitle>Saved Keywords</CardTitle>
            <CardDescription>
              Keywords used to filter out unwanted search results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {exclusionsLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : keywords.length === 0 ? (
              <p className="text-muted-foreground">No saved keywords yet</p>
            ) : (
              <div className="space-y-2">
                {keywords.map((keyword) => (
                  <div
                    key={keyword.id}
                    className="flex items-center justify-between p-3 rounded-md border"
                    data-testid={`keyword-entry-${keyword.id}`}
                  >
                    <div className="font-medium">{keyword.value}</div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteExclusionMutation.mutate(keyword.id)}
                      disabled={deleteExclusionMutation.isPending}
                      data-testid={`button-delete-keyword-${keyword.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Saved Place Types */}
        <Card>
          <CardHeader>
            <CardTitle>Saved Place Types</CardTitle>
            <CardDescription>
              Google Places API types used to exclude entire categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            {exclusionsLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : placeTypes.length === 0 ? (
              <p className="text-muted-foreground">No saved place types yet</p>
            ) : (
              <div className="space-y-2">
                {placeTypes.map((placeType) => (
                  <div
                    key={placeType.id}
                    className="flex items-center justify-between p-3 rounded-md border"
                    data-testid={`place-type-entry-${placeType.id}`}
                  >
                    <div className="font-medium">{placeType.value}</div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteExclusionMutation.mutate(placeType.id)}
                      disabled={deleteExclusionMutation.isPending}
                      data-testid={`button-delete-place-type-${placeType.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
