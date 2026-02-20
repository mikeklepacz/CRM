import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, Building2, Linkedin, Loader2, Mail, Sparkles, Users } from "lucide-react";
import type { BulkPreviewItem } from "../types";

export function BulkPreviewDialog({
  data,
  isLoading,
  totalCompanies,
  selectedPeople,
  onTogglePerson,
  onSelectAll,
  onDeselectAll,
  onEnrich,
  isEnriching,
}: {
  data: BulkPreviewItem[];
  isLoading: boolean;
  totalCompanies: number;
  selectedPeople: Set<string>;
  onTogglePerson: (key: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onEnrich: () => void;
  isEnriching: boolean;
}) {
  const allPeople = data.flatMap((item) =>
    item.preview?.contacts.map((person) => ({
      ...person,
      companyName: item.preview?.company?.name || item.contact.name,
      companyLink: item.contact.link,
      key: `${item.contact.link}::${person.id}`,
    })) || []
  );

  const totalFound = allPeople.length;
  const companiesWithPeople = data.filter((d) => d.preview?.contacts && d.preview.contacts.length > 0).length;
  const companiesWithErrors = data.filter((d) => d.error).length;
  const companiesNotFound = data.filter((d) => !d.preview?.company && !d.error).length;

  if (isLoading && data.length < totalCompanies) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="text-center">
          <p className="font-medium">Previewing companies...</p>
          <p className="text-sm text-muted-foreground">
            {data.length} of {totalCompanies} complete
          </p>
        </div>
        {data.length > 0 && (
          <div className="w-full max-w-md bg-muted rounded-full h-2 overflow-hidden">
            <div className="bg-primary h-full transition-all duration-300" style={{ width: `${(data.length / totalCompanies) * 100}%` }} />
          </div>
        )}
      </div>
    );
  }

  if (totalFound === 0 && !isLoading) {
    return (
      <div className="py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No contacts found across the selected companies.
            {companiesNotFound > 0 && ` ${companiesNotFound} companies were not found in Apollo.`}
            {companiesWithErrors > 0 && ` ${companiesWithErrors} companies had errors.`}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-sm">
          <Badge variant="outline">
            <Building2 className="h-3 w-3 mr-1" />
            {companiesWithPeople} companies with contacts
          </Badge>
          <Badge variant="outline">
            <Users className="h-3 w-3 mr-1" />
            {totalFound} people found
          </Badge>
          <Badge variant="secondary">{selectedPeople.size} selected</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onSelectAll} data-testid="button-select-all-people">
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={onDeselectAll} data-testid="button-deselect-all-people">
            Deselect All
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[400px] border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Seniority</TableHead>
              <TableHead>Company</TableHead>
              <TableHead className="w-16">Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allPeople.map((person) => (
              <TableRow key={person.key} data-testid={`row-bulk-person-${person.id}`}>
                <TableCell>
                  <Checkbox
                    checked={selectedPeople.has(person.key)}
                    onCheckedChange={() => onTogglePerson(person.key)}
                    data-testid={`checkbox-person-${person.id}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {person.first_name} {person.last_name?.replace(/\*+/g, "***")}
                  </div>
                  {person.linkedin_url && (
                    <a
                      href={person.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Linkedin className="h-3 w-3" />
                      LinkedIn
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm">{person.title || "-"}</span>
                </TableCell>
                <TableCell>
                  {person.seniority ? <Badge variant="outline" className="text-xs">{person.seniority}</Badge> : <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">{person.companyName}</span>
                </TableCell>
                <TableCell>
                  {person.has_email ? (
                    <Tooltip>
                      <TooltipTrigger>
                        <Mail className="h-4 w-4 text-green-600" />
                      </TooltipTrigger>
                      <TooltipContent>Has email available</TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      {(companiesWithErrors > 0 || companiesNotFound > 0) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {companiesNotFound > 0 && `${companiesNotFound} companies not found in Apollo. `}
            {companiesWithErrors > 0 && `${companiesWithErrors} companies had errors.`}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button onClick={onEnrich} disabled={isEnriching || selectedPeople.size === 0} data-testid="button-enrich-selected">
          {isEnriching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Enrich {selectedPeople.size} Selected People
        </Button>
      </div>
    </div>
  );
}

