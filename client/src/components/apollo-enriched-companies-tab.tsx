import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Linkedin, Users, MoreVertical, Trash2, EyeOff, FilterX } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { VoipCallButton } from "@/components/voip-call-button";

interface ApolloCompany {
  id: string;
  name?: string | null;
  industry?: string | null;
  employeeCount?: number | null;
  city?: string | null;
  state?: string | null;
  logoUrl?: string | null;
  linkedinUrl?: string | null;
  enrichedAt?: string | null;
  contactCount?: number | null;
  creditsUsed?: number | null;
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

  return (
    <div className="space-y-4">
      {companies.map((company) => (
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
                    {company.industry} · {company.employeeCount} employees · {company.city}, {company.state}
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
      ))}
    </div>
  );
}
