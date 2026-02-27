import type { AllContactsResponse, EhubContact } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Check, Loader2, X } from "lucide-react";

type EhubAllContactsTabProps = {
  allContactsData: AllContactsResponse | undefined;
  contactStatusFilter: string;
  handleClearSelection: () => void;
  handleSelectAllMatching: () => void;
  handleSelectAllOnPage: (checked: boolean | "indeterminate") => void;
  handleToggleContact: (contact: EhubContact) => void;
  isLoadingContacts: boolean;
  onNextPage: () => void;
  onPreviousPage: () => void;
  page: number;
  search: string;
  selectAllMode: "none" | "page" | "all";
  selectedContacts: EhubContact[];
  setContactStatusFilter: (value: string) => void;
  setIsAddToSequenceDialogOpen: (open: boolean) => void;
  setSearch: (value: string) => void;
};

export function EhubAllContactsTab({
  allContactsData,
  contactStatusFilter,
  handleClearSelection,
  handleSelectAllMatching,
  handleSelectAllOnPage,
  handleToggleContact,
  isLoadingContacts,
  onNextPage,
  onPreviousPage,
  page,
  search,
  selectAllMode,
  selectedContacts,
  setContactStatusFilter,
  setIsAddToSequenceDialogOpen,
  setSearch,
}: EhubAllContactsTabProps) {
  const totalPages = Math.ceil((allContactsData?.total || 0) / 50) || 1;

  return (
    <TabsContent value="all-contacts" className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Contacts</CardTitle>
              <CardDescription>Master contact list from Store Database</CardDescription>
            </div>
            <ToggleGroup
              type="single"
              value={contactStatusFilter}
              onValueChange={(value) => value && setContactStatusFilter(value)}
              data-testid="filter-contact-status"
            >
              <ToggleGroupItem value="all" data-testid="filter-all">
                All ({allContactsData?.statusCounts.all || 0})
              </ToggleGroupItem>
              <ToggleGroupItem value="neverContacted" data-testid="filter-never-contacted">
                Never Contacted ({allContactsData?.statusCounts.neverContacted || 0})
              </ToggleGroupItem>
              <ToggleGroupItem value="contacted" data-testid="filter-contacted">
                Contacted ({allContactsData?.statusCounts.contacted || 0})
              </ToggleGroupItem>
              <ToggleGroupItem value="inSequence" data-testid="filter-in-sequence">
                In Sequence ({allContactsData?.statusCounts.inSequence || 0})
              </ToggleGroupItem>
              <ToggleGroupItem value="replied" data-testid="filter-replied">
                Replied ({allContactsData?.statusCounts.replied || 0})
              </ToggleGroupItem>
              <ToggleGroupItem value="bounced" data-testid="filter-bounced">
                Bounced ({allContactsData?.statusCounts.bounced || 0})
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="pt-4">
            <Input
              placeholder="Search by name, email, state..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-contacts"
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingContacts ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : !allContactsData?.contacts || allContactsData.contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No contacts found</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectAllMode === "page" || selectAllMode === "all"}
                        onCheckedChange={handleSelectAllOnPage}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Sales Summary</TableHead>
                    <TableHead>Sequences</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allContactsData.contacts.map((contact) => {
                    const isSelected =
                      selectedContacts.some((selectedContact) => selectedContact.email === contact.email) ||
                      selectAllMode === "all";

                    return (
                      <TableRow key={contact.email} data-testid={`row-contact-${contact.email}`}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleContact(contact)}
                            data-testid={`checkbox-contact-${contact.email}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{contact.name}</TableCell>
                        <TableCell>{contact.email}</TableCell>
                        <TableCell>{contact.state || "—"}</TableCell>
                        <TableCell>{contact.hours || "—"}</TableCell>
                        <TableCell>
                          {contact.link ? (
                            <a
                              href={contact.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              View
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="max-w-md truncate">{contact.salesSummary || "—"}</TableCell>
                        <TableCell>
                          {contact.sequenceNames.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {contact.sequenceNames.map((seqName) => (
                                <Badge
                                  key={seqName}
                                  variant="outline"
                                  data-testid={`badge-sequence-${seqName}`}
                                >
                                  {seqName}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {selectAllMode === "page" &&
                allContactsData.total > allContactsData.contacts.length && (
                  <div className="mt-4 p-3 bg-muted rounded-md flex items-center justify-between">
                    <span className="text-sm">
                      All {allContactsData.contacts.length} contacts on this page are selected.
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAllMatching}
                      data-testid="button-select-all-matching"
                    >
                      Select all {allContactsData.total} matching contacts
                    </Button>
                  </div>
                )}

              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPreviousPage}
                    disabled={page === 1}
                    data-testid="button-prev-page"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onNextPage}
                    disabled={page >= totalPages}
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {(selectedContacts.length > 0 || selectAllMode === "all") && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground shadow-lg rounded-lg px-6 py-4 flex items-center gap-4 z-50">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span className="font-medium">
              {selectAllMode === "all"
                ? `All ${allContactsData?.total || 0} matching contacts selected`
                : `${selectedContacts.length} contact${selectedContacts.length !== 1 ? "s" : ""} selected`}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAddToSequenceDialogOpen(true)}
              data-testid="button-add-to-sequence"
            >
              Add to Sequence
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              data-testid="button-clear-selection"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </TabsContent>
  );
}
