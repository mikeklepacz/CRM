import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Factory,
  Globe,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  SkipForward,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import type { BulkPreviewItem } from "../types";

export interface LeadReviewQueueProps {
  data: BulkPreviewItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  isLoading: boolean;
  totalCompanies: number;
  selectedPeople: Set<string>;
  onTogglePerson: (key: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onEnrich: () => void;
  onSkip: () => void;
  onReject: () => void;
  isEnriching: boolean;
  keywordsExpanded: boolean;
  onToggleKeywords: () => void;
}

export function LeadReviewQueue({
  data,
  currentIndex,
  onIndexChange,
  isLoading,
  totalCompanies,
  selectedPeople,
  onTogglePerson,
  onSelectAll,
  onDeselectAll,
  onEnrich,
  onSkip,
  onReject,
  isEnriching,
}: LeadReviewQueueProps) {
  const currentItem = data[currentIndex];
  const preview = currentItem?.preview;
  const company = preview?.company;
  const allContacts = preview?.contacts || [];
  const contacts = allContacts.filter((p) => p.has_email);

  const currentPeopleKeys = contacts.map((person) => `${currentItem?.contact.link}::${person.id}`);
  const selectedCount = currentPeopleKeys.filter((key) => selectedPeople.has(key)).length;

  if (isLoading && data.length < totalCompanies) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="text-center">
          <p className="font-medium">Loading company data...</p>
          <p className="text-sm text-muted-foreground">
            {data.length} of {totalCompanies} complete
          </p>
        </div>
        <div className="w-full max-w-md bg-muted rounded-full h-2 overflow-hidden">
          <div className="bg-primary h-full transition-all duration-300" style={{ width: `${(data.length / totalCompanies) * 100}%` }} />
        </div>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="py-8 text-center">
        <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-4" />
        <h3 className="font-medium mb-2">Review Complete</h3>
        <p className="text-sm text-muted-foreground">You've reviewed all companies in the queue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[55vh]">
        <div className="pr-4 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Company {currentIndex + 1} of {data.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" disabled={currentIndex === 0} onClick={() => onIndexChange(currentIndex - 1)} data-testid="button-prev-company">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={currentIndex >= data.length - 1}
                onClick={() => onIndexChange(currentIndex + 1)}
                data-testid="button-next-company"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {currentItem.error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Error loading {currentItem.contact.name}: {currentItem.error}
              </AlertDescription>
            </Alert>
          ) : !company ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>"{currentItem.contact.name}" was not found in Apollo.</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  {company.logo_url && <img src={company.logo_url} alt={company.name} className="w-12 h-12 rounded-lg object-contain bg-muted" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{company.name}</h3>
                      {company.linkedin_url && (
                        <a href={company.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="h-4 w-4 text-blue-600" />
                        </a>
                      )}
                      {company.website_url && (
                        <a href={company.website_url} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{company.primary_domain}</div>
                  </div>
                </div>

                {company.short_description && <p className="text-sm text-muted-foreground">{company.short_description}</p>}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {company.estimated_num_employees && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{company.estimated_num_employees} employees</span>
                    </div>
                  )}
                  {(company.industry || (company.industries && company.industries.length > 0)) && (
                    <div className="flex items-center gap-2">
                      <Factory className="h-4 w-4 text-muted-foreground" />
                      <span>{company.industry || company.industries?.join(", ")}</span>
                    </div>
                  )}
                  {(company.city || company.state || company.country) && (
                    <div className="flex items-center gap-2 col-span-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{[company.city, company.state, company.country].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                </div>

                {company.keywords && company.keywords.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Keywords ({company.keywords.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {company.keywords.map((keyword, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Contacts ({contacts.length})
                  </h4>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onSelectAll} data-testid="button-select-all-review">
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={onDeselectAll} data-testid="button-deselect-all-review">
                      Deselect All
                    </Button>
                  </div>
                </div>

                {contacts.length > 0 ? (
                  <ScrollArea className="h-[200px] border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Seniority</TableHead>
                          <TableHead className="w-16">Email</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contacts.map((person) => {
                          const personKey = `${currentItem.contact.link}::${person.id}`;
                          return (
                            <TableRow key={person.id}>
                              <TableCell>
                                <Checkbox checked={selectedPeople.has(personKey)} onCheckedChange={() => onTogglePerson(personKey)} />
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">
                                  {person.first_name} {person.last_name?.replace(/\*+/g, "***")}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{person.title || "-"}</span>
                              </TableCell>
                              <TableCell>
                                {person.seniority ? <Badge variant="outline" className="text-xs">{person.seniority}</Badge> : "-"}
                              </TableCell>
                              <TableCell>{person.has_email ? <Mail className="h-4 w-4 text-green-600" /> : "-"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>No contacts found matching your target criteria.</AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      <div className="flex justify-between gap-2 pt-4 border-t">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReject} data-testid="button-reject-company">
            <Ban className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSkip} data-testid="button-skip-company">
            <SkipForward className="h-4 w-4 mr-2" />
            Skip
          </Button>
          <Button onClick={onEnrich} disabled={isEnriching || selectedCount === 0} data-testid="button-enrich-review">
            {isEnriching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Enrich {selectedCount} Selected
          </Button>
        </div>
      </div>
    </div>
  );
}

