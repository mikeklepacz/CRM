import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, RefreshCw } from "lucide-react";

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

  return (
    <ScrollArea className="h-[500px]">
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
          {mergedContacts.map((contact) => {
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
  );
}
