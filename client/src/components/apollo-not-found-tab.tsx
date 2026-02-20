import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, RotateCcw } from "lucide-react";

interface NotFoundCompany {
  id: string;
  name: string | null;
  domain: string | null;
  googleSheetLink: string;
  enrichedAt: string;
}

function extractDomain(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0] || null;
  }
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

export function ApolloNotFoundTab({
  companies,
  isLoading,
  projectId,
}: {
  companies?: NotFoundCompany[];
  isLoading: boolean;
  projectId?: string;
}) {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, { name: string; website: string; apolloLink: string }>>({});

  const rows = useMemo(
    () =>
      (companies || []).map((company) => {
        const draft = drafts[company.id];
        return {
          ...company,
          name: draft?.name ?? company.name ?? "",
          website: draft?.website ?? company.domain ?? "",
          apolloLink: draft?.apolloLink ?? "",
        };
      }),
    [companies, drafts]
  );

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
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/companies/not-found"] });
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/check-enrichment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/leads-without-emails"] });
      toast({ title: "Redo complete" });
    },
    onError: (error: any) => {
      toast({ title: "Redo failed", description: error.message || "Apollo retry failed", variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Companies Not Found in Apollo
        </CardTitle>
        <CardDescription>Edit details and click Redo. You can also paste an Apollo account URL.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !rows.length ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No companies have been marked as "not found" yet.</AlertDescription>
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
                {rows.map((company) => (
                  <TableRow key={company.id} data-testid={`row-not-found-${company.id}`}>
                    <TableCell>
                      <Input
                        value={company.name}
                        onChange={(e) => setDraft(company.id, { name: e.target.value })}
                        className="h-8"
                        data-testid={`input-notfound-name-${company.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={company.website}
                        onChange={(e) => setDraft(company.id, { website: e.target.value })}
                        className="h-8"
                        placeholder="https://example.com"
                        data-testid={`input-notfound-website-${company.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={company.apolloLink}
                        onChange={(e) => setDraft(company.id, { apolloLink: e.target.value })}
                        className="h-8"
                        placeholder="https://app.apollo.io/#/accounts/..."
                        data-testid={`input-notfound-apollo-${company.id}`}
                      />
                    </TableCell>
                    <TableCell>{new Date(company.enrichedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => redoMutation.mutate(company)}
                        disabled={redoMutation.isPending}
                        data-testid={`button-notfound-redo-${company.id}`}
                      >
                        {redoMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4 mr-1" />
                        )}
                        Redo
                      </Button>
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
