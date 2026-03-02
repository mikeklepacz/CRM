import { useEffect, useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Eye, RefreshCw } from "lucide-react";

export interface ApolloStoreContact {
  name: string;
  email: string;
  state: string;
  link: string;
  website: string;
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

export function ApolloEnrichLeadsTable({
  contacts,
  selectedLinks,
  onToggleSelectAll,
  onToggleSelect,
  onPreview,
  enrichmentStatus,
  failedEnrichmentLinks,
}: {
  contacts: ApolloStoreContact[];
  selectedLinks: Set<string>;
  onToggleSelectAll: () => void;
  onToggleSelect: (link: string) => void;
  onPreview: (contact: ApolloStoreContact) => void;
  enrichmentStatus?: Record<string, string | null>;
  failedEnrichmentLinks: Set<string>;
}) {
  const [drafts, setDrafts] = useState<Record<string, { name: string; website: string }>>({});
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const mergedContacts = useMemo(
    () =>
      contacts.map((contact) => {
        const draft = drafts[contact.link];
        return {
          ...contact,
          name: draft?.name ?? contact.name,
          website: draft?.website ?? contact.website,
        };
      }),
    [contacts, drafts]
  );

  const setDraft = (link: string, patch: Partial<{ name: string; website: string }>) => {
    setDrafts((prev) => ({
      ...prev,
      [link]: {
        name: patch.name ?? prev[link]?.name ?? contacts.find((c) => c.link === link)?.name ?? "",
        website: patch.website ?? prev[link]?.website ?? contacts.find((c) => c.link === link)?.website ?? "",
      },
    }));
  };

  const totalRows = mergedContacts.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
  const pageContacts = mergedContacts.slice(startIndex, endIndex);

  useEffect(() => {
    setPage(1);
  }, [totalRows, rowsPerPage]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="space-y-3">
      <ScrollArea className="h-[64vh] min-h-[520px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedLinks.size === contacts.length && contacts.length > 0}
                  onCheckedChange={onToggleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageContacts.map((contact) => {
              const status = enrichmentStatus?.[contact.link];
              const parsedDomain = extractDomain(contact.website);
              return (
                <TableRow key={contact.link} data-testid={`row-contact-${contact.link}`}>
                  <TableCell>
                    <Checkbox
                      checked={selectedLinks.has(contact.link)}
                      onCheckedChange={() => onToggleSelect(contact.link)}
                      data-testid={`checkbox-${contact.link}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={contact.name || ""}
                      onChange={(e) => setDraft(contact.link, { name: e.target.value })}
                      className="h-8"
                      data-testid={`input-company-${contact.link}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={contact.website || ""}
                      onChange={(e) => setDraft(contact.link, { website: e.target.value })}
                      className="h-8"
                      placeholder="https://example.com"
                      data-testid={`input-website-${contact.link}`}
                    />
                    <div className="text-xs text-muted-foreground mt-1">{parsedDomain || "-"}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{contact.email || "-"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{contact.state || "-"}</span>
                  </TableCell>
                  <TableCell>
                    {failedEnrichmentLinks.has(contact.link) ? (
                      <Badge variant="destructive">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </Badge>
                    ) : status === "prescreened" ? (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                        <Eye className="h-3 w-3 mr-1" />
                        Ready
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onPreview(contact)}
                      data-testid={`button-preview-${contact.link}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {totalRows === 0 ? 0 : startIndex + 1}-{endIndex} of {totalRows}
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
            data-testid="select-rows-per-page"
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Prev
          </Button>
          <div className="text-sm min-w-[72px] text-center">
            {page} / {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
            data-testid="button-next-page"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
