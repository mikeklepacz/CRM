import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowUpDown, Globe, Linkedin, Loader2, MoreVertical, Trash2, EyeOff, FilterX, Users } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { VoipCallButton } from "@/components/voip-call-button";

interface ApolloCompany {
  id: string;
  name?: string | null;
  industry?: string | null;
  keywords?: string[] | null;
  shortDescription?: string | null;
  employeeCount?: number | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  linkedinUrl?: string | null;
  enrichedAt?: string | null;
  contactCount?: number | null;
  creditsUsed?: number | null;
}

type CompanySortField = "enrichedAt" | "name" | "employeeCount" | "city" | "country" | "contactCount" | "creditsUsed";
type SortDirection = "asc" | "desc";

function safeString(value?: string | null): string {
  return (value || "").trim();
}

function compareNullableText(a?: string | null, b?: string | null): number {
  const aText = safeString(a).toLowerCase();
  const bText = safeString(b).toLowerCase();
  if (!aText && !bText) return 0;
  if (!aText) return 1;
  if (!bText) return -1;
  return aText.localeCompare(bText);
}

function compareNullableNumber(a?: number | null, b?: number | null): number {
  const aValue = typeof a === "number" ? a : Number.NEGATIVE_INFINITY;
  const bValue = typeof b === "number" ? b : Number.NEGATIVE_INFINITY;
  return aValue - bValue;
}

interface ApolloContact {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  seniority?: string | null;
  email?: string | null;
  emailStatus?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  linkedinUrl?: string | null;
  googleSheetLink?: string | null;
}

export function ApolloEnrichedCompaniesTab({
  companies,
  isLoading,
  projectId,
}: {
  companies: ApolloCompany[];
  isLoading: boolean;
  projectId?: string;
}) {
  const { toast } = useToast();
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [sortField, setSortField] = useState<CompanySortField>("enrichedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const { data: contacts } = useQuery<ApolloContact[]>({
    queryKey: ["/api/apollo/companies", expandedCompany, "contacts-clean", projectId || "all-projects"],
    queryFn: async () => {
      if (!expandedCompany) return [];
      const params = new URLSearchParams();
      if (projectId) {
        params.set("projectId", projectId);
      }
      const query = params.toString();
      const response = await fetch(`/api/apollo/companies/${expandedCompany}/contacts-clean${query ? `?${query}` : ""}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }
      return response.json();
    },
    enabled: !!expandedCompany,
  });

  const cleanupInvalidMutation = useMutation({
    mutationFn: async (companyId: string) =>
      apiRequest("POST", "/api/apollo/contacts/cleanup-invalid", { companyId, projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/companies", expandedCompany, "contacts-clean"] });
      toast({ title: "Invalid contacts removed" });
    },
    onError: (err: any) => toast({ title: "Cleanup failed", description: err.message, variant: "destructive" }),
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => apiRequest("DELETE", `/api/apollo/contacts/${contactId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/companies", expandedCompany, "contacts-clean"] });
      toast({ title: "Contact removed" });
    },
    onError: (err: any) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  const hideCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => apiRequest("PATCH", `/api/apollo/companies/${companyId}/hide`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/companies"] });
      toast({ title: "Company hidden" });
    },
    onError: (err: any) => toast({ title: "Hide failed", description: err.message, variant: "destructive" }),
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => apiRequest("DELETE", `/api/apollo/companies/${companyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/companies", expandedCompany, "contacts-clean"] });
      setExpandedCompany(null);
      toast({ title: "Company deleted" });
    },
    onError: (err: any) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No enriched companies yet</h3>
          <p className="text-sm text-muted-foreground">
            Go to the "Enrich Leads" tab to enrich your first company.
          </p>
        </CardContent>
      </Card>
    );
  }

  const availableCountries = useMemo(
    () => Array.from(new Set(companies.map((company) => safeString(company.country)).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [companies]
  );

  const availableCities = useMemo(
    () => Array.from(new Set(companies.map((company) => safeString(company.city)).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [companies]
  );

  const filteredCompanies = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const filtered = companies.filter((company) => {
      if (countryFilter !== "all" && safeString(company.country) !== countryFilter) {
        return false;
      }
      if (cityFilter !== "all" && safeString(company.city) !== cityFilter) {
        return false;
      }
      if (!query) {
        return true;
      }

      const keywordText = (company.keywords || []).join(" ").toLowerCase();
      const haystack = [
        company.name,
        company.industry,
        company.websiteUrl,
        company.city,
        company.state,
        company.country,
        company.shortDescription,
        keywordText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    filtered.sort((a, b) => {
      let base = 0;
      switch (sortField) {
        case "name":
          base = compareNullableText(a.name, b.name);
          break;
        case "employeeCount":
          base = compareNullableNumber(a.employeeCount, b.employeeCount);
          break;
        case "city":
          base = compareNullableText(a.city, b.city);
          break;
        case "country":
          base = compareNullableText(a.country, b.country);
          break;
        case "contactCount":
          base = compareNullableNumber(a.contactCount, b.contactCount);
          break;
        case "creditsUsed":
          base = compareNullableNumber(a.creditsUsed, b.creditsUsed);
          break;
        case "enrichedAt":
        default: {
          const aTime = a.enrichedAt ? new Date(a.enrichedAt).getTime() : Number.NEGATIVE_INFINITY;
          const bTime = b.enrichedAt ? new Date(b.enrichedAt).getTime() : Number.NEGATIVE_INFINITY;
          base = aTime - bTime;
          break;
        }
      }

      if (base === 0) {
        base = compareNullableText(a.name, b.name);
      }

      return sortDirection === "asc" ? base : -base;
    });

    return filtered;
  }, [cityFilter, companies, countryFilter, searchQuery, sortDirection, sortField]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Enriched Company Explorer</CardTitle>
          <CardDescription>
            Search and sort enriched companies by name, employee size, location, contacts, and credits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_180px_180px_220px_120px]">
            <div className="space-y-1">
              <Label htmlFor="apollo-enriched-search">Search</Label>
              <Input
                id="apollo-enriched-search"
                placeholder="Company, industry, city, country, keyword..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Country</Label>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All countries</SelectItem>
                  {availableCountries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>City</Label>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cities</SelectItem>
                  {availableCities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Sort by</Label>
              <Select value={sortField} onValueChange={(value) => setSortField(value as CompanySortField)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enrichedAt">Enriched Date</SelectItem>
                  <SelectItem value="name">Company Name</SelectItem>
                  <SelectItem value="employeeCount">Employees</SelectItem>
                  <SelectItem value="city">City</SelectItem>
                  <SelectItem value="country">Country</SelectItem>
                  <SelectItem value="contactCount">Contact Count</SelectItem>
                  <SelectItem value="creditsUsed">Credits Used</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Order</Label>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                {sortDirection === "asc" ? "Ascending" : "Descending"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {filteredCompanies.length} of {companies.length} companies
          </p>
        </CardContent>
      </Card>

      {filteredCompanies.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No enriched companies match the current search and filters.
          </CardContent>
        </Card>
      ) : (
        filteredCompanies.map((company) => (
        <Card key={company.id}>
          <CardHeader className="cursor-pointer hover-elevate" onClick={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {company.logoUrl && (
                  <img src={company.logoUrl} alt={company.name || ""} className="h-10 w-10 rounded object-contain bg-white" />
                )}
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {company.name || "Unnamed Company"}
                    {company.linkedinUrl && (
                      <a href={company.linkedinUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                        <Linkedin className="h-4 w-4 text-blue-600" />
                      </a>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {[company.industry, company.employeeCount ? `${company.employeeCount.toLocaleString()} employees` : null, [company.city, company.state, company.country].filter(Boolean).join(", ")]
                      .filter(Boolean)
                      .join(" · ")}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Badge variant={company.contactCount === 0 ? "destructive" : "default"}>{company.contactCount || 0} contacts</Badge>
                <Badge variant="outline">{company.creditsUsed || 0} credits</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`button-company-actions-${company.id}`}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => cleanupInvalidMutation.mutate(company.id)}>
                      <FilterX className="h-4 w-4 mr-2" />
                      Remove Invalid Emails
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => hideCompanyMutation.mutate(company.id)}>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide Company
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => deleteCompanyMutation.mutate(company.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Company
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          {expandedCompany === company.id && (
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 mb-4">
                <div className="rounded-md border p-3">
                  <p className="text-xs uppercase text-muted-foreground tracking-wide">About</p>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {company.shortDescription || "No company summary available from Apollo."}
                  </p>
                </div>
                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-xs uppercase text-muted-foreground tracking-wide">Company Details</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>{[company.city, company.state, company.country].filter(Boolean).join(", ") || "Location unavailable"}</div>
                    {company.websiteUrl ? (
                      <a
                        href={company.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        Website
                      </a>
                    ) : (
                      <div>Website unavailable</div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(company.keywords || []).length > 0 ? (
                      (company.keywords || []).slice(0, 12).map((keyword) => (
                        <Badge key={`${company.id}-${keyword}`} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No keywords available</span>
                    )}
                  </div>
                </div>
              </div>
              <h4 className="font-medium mb-3">Contacts</h4>
              {contacts && contacts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[70px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id} data-testid={`row-enriched-contact-${contact.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {contact.photoUrl && <img src={contact.photoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />}
                            <div>
                              <p className="font-medium">{contact.firstName} {contact.lastName}</p>
                              {contact.linkedinUrl && (
                                <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                  LinkedIn
                                </a>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{contact.title || "-"}</TableCell>
                        <TableCell>{contact.email ? <a href={`mailto:${contact.email}`} className="text-sm text-primary hover:underline">{contact.email}</a> : "-"}</TableCell>
                        <TableCell>
                          {contact.phone ? (
                            <VoipCallButton phoneNumber={contact.phone} storeName={`${contact.firstName || ""} ${contact.lastName || ""}`.trim() || undefined} storeLink={contact.googleSheetLink || undefined} className="text-sm cursor-pointer hover:underline">
                              {contact.phone}
                            </VoipCallButton>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={contact.emailStatus === "verified" ? "default" : "secondary"}>
                            {contact.emailStatus || "unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteContactMutation.mutate(contact.id)} data-testid={`button-delete-contact-${contact.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-sm">No contacts</p>
              )}
            </CardContent>
          )}
        </Card>
      ))
      )}
    </div>
  );
}
