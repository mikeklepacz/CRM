import type { AllContactsResponse, EhubContact } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
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
import { Check, Info, Loader2, X } from "lucide-react";

type ApolloCompanyRow = {
  id: string;
  name?: string | null;
  contactCount?: number | null;
  websiteUrl?: string | null;
  shortDescription?: string | null;
  keywords?: string[] | null;
};

type ApolloContactRow = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  seniority?: string | null;
  email?: string | null;
  emailStatus?: string | null;
};

type ApolloContactListItem = ApolloContactRow & {
  companyId: string;
  companyName: string;
};

type ApolloMappedRow = {
  companyName: string;
  companyWebsite?: string | null;
  companyShortDescription?: string | null;
  companyKeywords?: string[] | null;
  ehubContact: EhubContact;
  emailStatus?: string | null;
  seniority?: string | null;
  title?: string | null;
};

type EhubAllContactsTabProps = {
  allContactsData: AllContactsResponse | undefined;
  contactStatusFilter: string;
  currentProjectId?: string;
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
  setSelectedContacts: (value: EhubContact[] | ((prev: EhubContact[]) => EhubContact[])) => void;
  setSelectAllMode: (mode: "none" | "page" | "all") => void;
  setContactStatusFilter: (value: string) => void;
  setIsAddToSequenceDialogOpen: (open: boolean) => void;
  setSearch: (value: string) => void;
};

export function EhubAllContactsTab({
  allContactsData,
  contactStatusFilter,
  currentProjectId,
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
  setSelectedContacts,
  setSelectAllMode,
  setContactStatusFilter,
  setIsAddToSequenceDialogOpen,
  setSearch,
}: EhubAllContactsTabProps) {
  const totalPages = Math.ceil((allContactsData?.total || 0) / 50) || 1;
  const isApolloFilter = contactStatusFilter === "apollo";

  const { data: apolloCompanies, isLoading: isApolloCompaniesLoading } = useQuery<ApolloCompanyRow[]>({
    queryKey: ["/api/apollo/companies", "ehub-filter", currentProjectId || "none"],
    queryFn: async () => {
      if (!currentProjectId) return [];
      const params = new URLSearchParams({ projectId: currentProjectId });
      const response = await fetch(`/api/apollo/companies?${params.toString()}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load Apollo companies");
      return response.json();
    },
    enabled: !!currentProjectId,
  });

  const { data: apolloContacts, isLoading: isApolloContactsLoading } = useQuery<ApolloContactListItem[]>({
    queryKey: ["/api/apollo/contacts", "ehub-filter", currentProjectId || "none"],
    queryFn: async () => {
      if (!currentProjectId) return [];

      const params = new URLSearchParams({ projectId: currentProjectId });
      const companiesResponse = await fetch(`/api/apollo/companies?${params.toString()}`, { credentials: "include" });
      if (!companiesResponse.ok) throw new Error("Failed to load Apollo companies");
      const companies = (await companiesResponse.json()) as ApolloCompanyRow[];

      const perCompany = await Promise.all(
        companies.map(async (company) => {
          const response = await fetch(
            `/api/apollo/companies/${company.id}/contacts-clean?${params.toString()}`,
            { credentials: "include" }
          );
          if (!response.ok) return [] as ApolloContactListItem[];
          const contacts = (await response.json()) as ApolloContactRow[];
          return contacts.map((contact) => ({
            ...contact,
            companyId: company.id,
            companyName: company.name || "Unnamed Company",
          }));
        })
      );

      return perCompany.flat();
    },
    enabled: isApolloFilter && !!currentProjectId,
  });

  const apolloCount = apolloCompanies?.reduce((sum, row) => sum + (row.contactCount || 0), 0) || 0;
  const apolloSearch = search.trim().toLowerCase();
  const filteredApolloContacts = !apolloContacts
    ? []
    : apolloContacts.filter((contact) => {
        if (!apolloSearch) return true;
        const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ").toLowerCase();
        return (
          fullName.includes(apolloSearch) ||
          (contact.email || "").toLowerCase().includes(apolloSearch) ||
          (contact.title || "").toLowerCase().includes(apolloSearch) ||
          (contact.seniority || "").toLowerCase().includes(apolloSearch) ||
          (contact.companyName || "").toLowerCase().includes(apolloSearch)
        );
      });

  const mappedApolloRows: ApolloMappedRow[] = filteredApolloContacts
    .filter((contact) => !!contact.email)
    .map((contact) => {
      const company = (apolloCompanies || []).find((row) => row.id === contact.companyId);
      return {
        companyName: contact.companyName,
        companyWebsite: company?.websiteUrl,
        companyShortDescription: company?.shortDescription,
        companyKeywords: company?.keywords,
        emailStatus: contact.emailStatus,
        seniority: contact.seniority,
        title: contact.title,
        ehubContact: {
          name: [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unnamed Contact",
          email: (contact.email || "").toLowerCase(),
          state: "",
          timezone: "America/New_York",
          hours: "",
          link: `apollo:${contact.companyId}:${contact.id}`,
          salesSummary: [contact.companyName, contact.title].filter(Boolean).join(" - "),
          neverContacted: true,
          contacted: false,
          inSequence: false,
          replied: false,
          bounced: false,
          sequenceNames: [],
        },
      };
    });

  const selectedApolloEmailSet = new Set(selectedContacts.map((contact) => contact.email.toLowerCase()));
  const allApolloSelected =
    mappedApolloRows.length > 0 &&
    mappedApolloRows.every((row) => selectedApolloEmailSet.has(row.ehubContact.email.toLowerCase()));

  const toggleApolloContact = (contact: EhubContact) => {
    setSelectAllMode("none");
    setSelectedContacts((prev) => {
      const exists = prev.some((item) => item.email.toLowerCase() === contact.email.toLowerCase());
      if (exists) {
        return prev.filter((item) => item.email.toLowerCase() !== contact.email.toLowerCase());
      }
      return [...prev, contact];
    });
  };

  const toggleSelectAllApollo = (checked: boolean | "indeterminate") => {
    if (checked) {
      setSelectedContacts(mappedApolloRows.map((row) => row.ehubContact));
      setSelectAllMode("page");
      return;
    }
    setSelectedContacts([]);
    setSelectAllMode("none");
  };

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
              <ToggleGroupItem value="apollo" data-testid="filter-apollo">
                Apollo ({apolloCount})
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
          {isApolloFilter ? (
            !currentProjectId ? (
              <div className="text-center py-8 text-muted-foreground">Select a project to view Apollo contacts</div>
            ) : isApolloCompaniesLoading || isApolloContactsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : !filteredApolloContacts.length ? (
              <div className="text-center py-8 text-muted-foreground">No Apollo contacts found for this project</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allApolloSelected}
                        onCheckedChange={toggleSelectAllApollo}
                        data-testid="checkbox-select-all-apollo"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Seniority</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedApolloRows.map((row) => (
                    <TableRow key={row.ehubContact.link} data-testid={`row-apollo-contact-${row.ehubContact.link}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedApolloEmailSet.has(row.ehubContact.email.toLowerCase())}
                          onCheckedChange={() => toggleApolloContact(row.ehubContact)}
                          data-testid={`checkbox-apollo-contact-${row.ehubContact.email}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {row.ehubContact.name}
                      </TableCell>
                      <TableCell>{row.ehubContact.email || "—"}</TableCell>
                      <TableCell>{row.title || "—"}</TableCell>
                      <TableCell>{row.seniority || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{row.companyName || "—"}</span>
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground"
                                data-testid={`button-apollo-company-info-${row.ehubContact.link}`}
                                aria-label="Company insights"
                              >
                                <Info className="h-4 w-4" />
                              </button>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-[360px] space-y-2" align="start">
                              <div className="text-sm font-medium">{row.companyName || "Company"}</div>
                              {row.companyWebsite ? (
                                <a
                                  href={row.companyWebsite}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline break-all"
                                >
                                  {row.companyWebsite}
                                </a>
                              ) : (
                                <div className="text-xs text-muted-foreground">No website saved</div>
                              )}
                              <div className="text-xs leading-relaxed text-muted-foreground max-h-28 overflow-y-auto">
                                {row.companyShortDescription || "No short description saved"}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {(row.companyKeywords && row.companyKeywords.length > 0) ? (
                                  row.companyKeywords.slice(0, 12).map((keyword) => (
                                    <Badge key={`${row.ehubContact.link}-${keyword}`} variant="secondary" className="text-[10px]">
                                      {keyword}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground">No keywords saved</span>
                                )}
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.emailStatus === "verified" ? "default" : "outline"}>
                          {row.emailStatus || "unknown"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : isLoadingContacts ? (
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
