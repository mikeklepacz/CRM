import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { extractDomain } from "@/lib/extract-domain";
import { Archive, AlertCircle, Loader2, RotateCcw, Undo2 } from "lucide-react";

interface ApolloCompanyRow {
  id: string;
  name: string | null;
  domain: string | null;
  googleSheetLink: string;
  enrichedAt: string;
}

function parseApolloAccountId(input: string | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const idMatch = trimmed.match(/^[a-f0-9]{24}$/i);
  if (idMatch) return idMatch[0];
  const urlMatch = trimmed.match(/\/accounts\/([a-f0-9]{24})/i);
  return urlMatch?.[1] || null;
}

function notFoundQueryKey(projectId?: string) {
  return ["/api/apollo/companies/not-found", projectId || "all-projects"];
}

function retiredQueryKey(projectId?: string) {
  return ["/api/apollo/companies/retired", projectId || "all-projects"];
}

export function ApolloNotFoundTab({
  companies,
  isLoading,
  projectId,
}: {
  companies?: ApolloCompanyRow[];
  isLoading: boolean;
  projectId?: string;
}) {
  const { toast } = useToast();
  const [showRetired, setShowRetired] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, { name: string; website: string; apolloLink: string }>>({});

  const { data: retiredCompanies, isLoading: retiredLoading } = useQuery<ApolloCompanyRow[]>({
    queryKey: retiredQueryKey(projectId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      const response = await fetch(`/api/apollo/companies/retired?${params.toString()}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch retired companies");
      return response.json();
    },
    enabled: showRetired,
  });

  const rows = useMemo(
    () =>
      (companies || []).map((company) => {
        const draft = drafts[company.id];
        return {
          ...company,
          isRetired: false,
          name: draft?.name ?? company.name ?? "",
          website: draft?.website ?? company.domain ?? "",
          apolloLink: draft?.apolloLink ?? "",
        };
      }),
    [companies, drafts]
  );

  const retiredRows = useMemo(
    () =>
      (retiredCompanies || []).map((company) => ({
        ...company,
        isRetired: true,
        name: company.name ?? "",
        website: company.domain ?? "",
        apolloLink: "",
      })),
    [retiredCompanies]
  );

  const displayRows = showRetired ? [...rows, ...retiredRows] : rows;

  const setDraft = (id: string, patch: Partial<{ name: string; website: string; apolloLink: string }>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        name: patch.name ?? prev[id]?.name ?? "",
        website: patch.website ?? prev[id]?.website ?? "",
        apolloLink: patch.apolloLink ?? prev[id]?.apolloLink ?? "",
      },
    }));
  };

  const invalidateApolloLists = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/apollo/companies"] });
    queryClient.invalidateQueries({ queryKey: ["/api/apollo/check-enrichment"] });
    queryClient.invalidateQueries({ queryKey: ["/api/apollo/leads-without-emails"] });
    queryClient.invalidateQueries({ queryKey: notFoundQueryKey(projectId) });
    queryClient.invalidateQueries({ queryKey: retiredQueryKey(projectId) });
  };

  const redoMutation = useMutation({
    mutationFn: async (row: { googleSheetLink: string; name: string; website: string; apolloLink: string }) => {
      const domain = extractDomain(row.website);
      const organizationId = parseApolloAccountId(row.apolloLink);
      return apiRequest("POST", "/api/apollo/enrich", {
        googleSheetLink: row.googleSheetLink,
        projectId,
        domain: domain || undefined,
        companyName: row.name || undefined,
        organizationId: organizationId || undefined,
      });
    },
    onSuccess: () => {
      invalidateApolloLists();
      toast({ title: "Redo complete" });
    },
    onError: (error: any) => {
      toast({ title: "Redo failed", description: error.message || "Apollo retry failed", variant: "destructive" });
    },
  });

  const retireMutation = useMutation({
    mutationFn: async (companyId: string) => apiRequest("PATCH", `/api/apollo/companies/${companyId}/hide`),
    onSuccess: () => {
      invalidateApolloLists();
      toast({ title: "Company retired" });
    },
    onError: (error: any) => {
      toast({ title: "Retire failed", description: error.message || "Failed to retire company", variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (companyId: string) => apiRequest("PATCH", `/api/apollo/companies/${companyId}/restore-not-found`),
    onSuccess: () => {
      invalidateApolloLists();
      toast({ title: "Company restored" });
    },
    onError: (error: any) => {
      toast({ title: "Restore failed", description: error.message || "Failed to restore company", variant: "destructive" });
    },
  });

  const isBusy = redoMutation.isPending || retireMutation.isPending || restoreMutation.isPending;
  const isTableLoading = isLoading || (showRetired && retiredLoading);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Companies Not Found in Apollo
            </CardTitle>
            <CardDescription>Edit details and click Redo. You can retire rows and restore them later.</CardDescription>
          </div>
          <Button
            variant={showRetired ? "default" : "outline"}
            size="sm"
            onClick={() => setShowRetired((v) => !v)}
            data-testid="button-toggle-retired"
          >
            <Archive className="h-4 w-4 mr-2" />
            {showRetired ? "Hide Retired" : `Show Retired (${retiredCompanies?.length || 0})`}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isTableLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !displayRows.length ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No companies in this view.</AlertDescription>
          </Alert>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Website / Domain</TableHead>
                  <TableHead>Apollo URL / ID</TableHead>
                  <TableHead>Checked Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.map((company) => (
                  <TableRow key={company.id} data-testid={`row-not-found-${company.id}`}>
                    <TableCell>
                      <Input
                        value={company.name}
                        onChange={(e) => setDraft(company.id, { name: e.target.value })}
                        className="h-8"
                        disabled={company.isRetired}
                        data-testid={`input-notfound-name-${company.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={company.website}
                        onChange={(e) => setDraft(company.id, { website: e.target.value })}
                        className="h-8"
                        placeholder="https://example.com"
                        disabled={company.isRetired}
                        data-testid={`input-notfound-website-${company.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={company.apolloLink}
                        onChange={(e) => setDraft(company.id, { apolloLink: e.target.value })}
                        className="h-8"
                        placeholder="https://app.apollo.io/#/accounts/..."
                        disabled={company.isRetired}
                        data-testid={`input-notfound-apollo-${company.id}`}
                      />
                    </TableCell>
                    <TableCell>{new Date(company.enrichedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {company.isRetired ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => restoreMutation.mutate(company.id)}
                          disabled={isBusy}
                          data-testid={`button-notfound-restore-${company.id}`}
                        >
                          {restoreMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Undo2 className="h-4 w-4 mr-1" />
                          )}
                          Restore
                        </Button>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retireMutation.mutate(company.id)}
                            disabled={isBusy}
                            data-testid={`button-notfound-retire-${company.id}`}
                          >
                            {retireMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Archive className="h-4 w-4 mr-1" />
                            )}
                            Retire
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => redoMutation.mutate(company)}
                            disabled={isBusy}
                            data-testid={`button-notfound-redo-${company.id}`}
                          >
                            {redoMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4 mr-1" />
                            )}
                            Redo
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
