import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Loader2, 
  Search, 
  Sparkles, 
  Users, 
  Building2, 
  Mail, 
  Phone, 
  ExternalLink,
  Settings,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  Download,
  Linkedin,
  Globe
} from "lucide-react";

interface ApolloSettings {
  id: string;
  tenantId: string;
  targetTitles: string[] | null;
  targetSeniorities: string[] | null;
  maxContactsPerCompany: number | null;
  autoEnrichOnAdd: boolean | null;
  creditsUsedThisMonth: number | null;
  creditsResetDate: string | null;
}

interface ApolloCompany {
  id: string;
  tenantId: string;
  googleSheetLink: string;
  apolloOrgId: string | null;
  domain: string | null;
  name: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  employeeCount: number | null;
  industry: string | null;
  foundedYear: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
  logoUrl: string | null;
  enrichedAt: string;
  creditsUsed: number | null;
}

interface ApolloContact {
  id: string;
  tenantId: string;
  companyId: string | null;
  googleSheetLink: string;
  apolloPersonId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  emailStatus: string | null;
  title: string | null;
  seniority: string | null;
  department: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  photoUrl: string | null;
  headline: string | null;
  isLikelyToEngage: boolean | null;
  enrichedAt: string;
  creditsUsed: number | null;
}

interface PreviewResult {
  company: {
    id: string;
    name: string;
    primary_domain?: string;
    website_url?: string;
    estimated_num_employees?: number;
    industry?: string;
    city?: string;
    state?: string;
    country?: string;
    linkedin_url?: string;
    logo_url?: string;
  } | null;
  contacts: Array<{
    id: string;
    first_name?: string;
    last_name?: string;
    title?: string;
    seniority?: string;
    has_email?: boolean;
    linkedin_url?: string;
  }>;
  totalContacts: number;
}

interface StoreContact {
  name: string;
  email: string;
  link: string;
  state?: string;
  website?: string;
}

const SENIORITY_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "founder", label: "Founder" },
  { value: "c_suite", label: "C-Suite" },
  { value: "partner", label: "Partner" },
  { value: "vp", label: "VP" },
  { value: "head", label: "Head" },
  { value: "director", label: "Director" },
  { value: "manager", label: "Manager" },
  { value: "senior", label: "Senior" },
  { value: "entry", label: "Entry" },
];

const DEFAULT_TITLES = ["Owner", "Manager", "Director", "Buyer", "Purchasing Manager", "Store Manager"];

function extractDomain(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
  }
}

export default function Apollo() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("enrich");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<StoreContact | null>(null);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  const [isEnriching, setIsEnriching] = useState(false);

  const { data: settings, isLoading: settingsLoading } = useQuery<ApolloSettings>({
    queryKey: ["/api/apollo/settings"],
  });

  const { data: enrichedCompanies, isLoading: companiesLoading } = useQuery<ApolloCompany[]>({
    queryKey: ["/api/apollo/companies"],
  });

  const { data: storeContacts, isLoading: storeLoading } = useQuery<{ contacts: StoreContact[] }>({
    queryKey: ["/api/ehub/all-contacts"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<ApolloSettings>) => {
      return apiRequest("/api/apollo/settings", {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/settings"] });
      toast({ title: "Settings updated" });
      setSettingsOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update settings", description: error.message, variant: "destructive" });
    },
  });

  const previewMutation = useMutation({
    mutationFn: async ({ domain, companyName }: { domain?: string; companyName?: string }) => {
      return apiRequest("/api/apollo/preview", {
        method: "POST",
        body: JSON.stringify({ domain, companyName }),
      });
    },
    onSuccess: (data) => {
      setPreviewResult(data as PreviewResult);
    },
    onError: (error: any) => {
      toast({ title: "Preview failed", description: error.message, variant: "destructive" });
    },
  });

  const enrichMutation = useMutation({
    mutationFn: async ({ googleSheetLink, domain, companyName }: { googleSheetLink: string; domain?: string; companyName?: string }) => {
      return apiRequest("/api/apollo/enrich", {
        method: "POST",
        body: JSON.stringify({ googleSheetLink, domain, companyName }),
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/settings"] });
      toast({ 
        title: "Enrichment complete", 
        description: `Found ${data.contacts?.length || 0} contacts. Used ${data.creditsUsed || 0} credits.` 
      });
      setPreviewOpen(false);
      setPreviewResult(null);
    },
    onError: (error: any) => {
      toast({ title: "Enrichment failed", description: error.message, variant: "destructive" });
    },
  });

  const { data: enrichmentStatus } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/apollo/check-enrichment", storeContacts?.contacts?.map(c => c.link)],
    queryFn: async () => {
      const links = storeContacts?.contacts?.map(c => c.link).filter(Boolean) || [];
      if (links.length === 0) return {};
      const response = await apiRequest("/api/apollo/check-enrichment", {
        method: "POST",
        body: JSON.stringify({ links }),
      });
      return response as Record<string, boolean>;
    },
    enabled: !!storeContacts?.contacts?.length,
  });

  const handlePreview = (contact: StoreContact) => {
    setSelectedContact(contact);
    setPreviewResult(null);
    setPreviewOpen(true);
    
    const domain = extractDomain(contact.website);
    previewMutation.mutate({
      domain: domain || undefined,
      companyName: !domain ? contact.name : undefined,
    });
  };

  const handleEnrich = () => {
    if (!selectedContact) return;
    
    const domain = extractDomain(selectedContact.website);
    enrichMutation.mutate({
      googleSheetLink: selectedContact.link,
      domain: domain || undefined,
      companyName: !domain ? selectedContact.name : undefined,
    });
  };

  const handleBulkEnrich = async () => {
    if (selectedLinks.size === 0) return;
    
    setIsEnriching(true);
    const contacts = storeContacts?.contacts?.filter(c => selectedLinks.has(c.link)) || [];
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const contact of contacts) {
      try {
        const domain = extractDomain(contact.website);
        await apiRequest("/api/apollo/enrich", {
          method: "POST",
          body: JSON.stringify({
            googleSheetLink: contact.link,
            domain: domain || undefined,
            companyName: !domain ? contact.name : undefined,
          }),
        });
        successCount++;
      } catch {
        errorCount++;
      }
    }
    
    setIsEnriching(false);
    setSelectedLinks(new Set());
    queryClient.invalidateQueries({ queryKey: ["/api/apollo/companies"] });
    queryClient.invalidateQueries({ queryKey: ["/api/apollo/check-enrichment"] });
    queryClient.invalidateQueries({ queryKey: ["/api/apollo/settings"] });
    
    toast({
      title: "Bulk enrichment complete",
      description: `Enriched ${successCount} companies. ${errorCount > 0 ? `${errorCount} failed.` : ""}`,
    });
  };

  const filteredContacts = storeContacts?.contacts?.filter(contact => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contact.name?.toLowerCase().includes(query) ||
      contact.email?.toLowerCase().includes(query) ||
      contact.state?.toLowerCase().includes(query)
    );
  }) || [];

  const notEnrichedContacts = filteredContacts.filter(c => !enrichmentStatus?.[c.link]);

  const toggleSelectAll = () => {
    if (selectedLinks.size === notEnrichedContacts.length) {
      setSelectedLinks(new Set());
    } else {
      setSelectedLinks(new Set(notEnrichedContacts.map(c => c.link)));
    }
  };

  const toggleSelect = (link: string) => {
    const newSet = new Set(selectedLinks);
    if (newSet.has(link)) {
      newSet.delete(link);
    } else {
      newSet.add(link);
    }
    setSelectedLinks(newSet);
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Apollo Enrichment
          </h1>
          <p className="text-muted-foreground">
            Enrich your leads with contact data from Apollo.io
          </p>
        </div>
        <div className="flex items-center gap-3">
          {settings && (
            <Badge variant="outline" className="text-sm">
              {settings.creditsUsedThisMonth || 0} credits used this month
            </Badge>
          )}
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-apollo-settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Apollo Enrichment Settings</DialogTitle>
                <DialogDescription>
                  Configure which contacts to target during enrichment
                </DialogDescription>
              </DialogHeader>
              <SettingsForm 
                settings={settings} 
                onSave={(updates) => updateSettingsMutation.mutate(updates)}
                isLoading={updateSettingsMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="enrich" data-testid="tab-enrich">
            <Search className="h-4 w-4 mr-2" />
            Enrich Leads
          </TabsTrigger>
          <TabsTrigger value="enriched" data-testid="tab-enriched">
            <Users className="h-4 w-4 mr-2" />
            Enriched Contacts ({enrichedCompanies?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enrich" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Store Database Contacts</CardTitle>
                  <CardDescription>
                    Select companies to enrich with Apollo contact data
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search by name, email, or state..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                    data-testid="input-search"
                  />
                  {selectedLinks.size > 0 && (
                    <Button 
                      onClick={handleBulkEnrich}
                      disabled={isEnriching}
                      data-testid="button-bulk-enrich"
                    >
                      {isEnriching ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Enrich {selectedLinks.size} Selected
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {storeLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No contacts found. Make sure your Store Database Google Sheet is connected.
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={selectedLinks.size === notEnrichedContacts.length && notEnrichedContacts.length > 0}
                            onCheckedChange={toggleSelectAll}
                            data-testid="checkbox-select-all"
                          />
                        </TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContacts.map((contact) => {
                        const isEnriched = enrichmentStatus?.[contact.link];
                        return (
                          <TableRow key={contact.link} data-testid={`row-contact-${contact.link}`}>
                            <TableCell>
                              <Checkbox
                                checked={selectedLinks.has(contact.link)}
                                onCheckedChange={() => toggleSelect(contact.link)}
                                disabled={isEnriched}
                                data-testid={`checkbox-${contact.link}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{contact.name}</div>
                              {contact.website && (
                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {extractDomain(contact.website)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{contact.email || "-"}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{contact.state || "-"}</span>
                            </TableCell>
                            <TableCell>
                              {isEnriched ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Enriched
                                </Badge>
                              ) : (
                                <Badge variant="outline">Not Enriched</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreview(contact)}
                                disabled={isEnriched}
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enriched" className="space-y-4">
          <EnrichedCompaniesTab companies={enrichedCompanies || []} isLoading={companiesLoading} />
        </TabsContent>
      </Tabs>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview Apollo Data</DialogTitle>
            <DialogDescription>
              Review available contacts before enriching
            </DialogDescription>
          </DialogHeader>
          <PreviewDialog
            contact={selectedContact}
            preview={previewResult}
            isLoading={previewMutation.isPending}
            onEnrich={handleEnrich}
            isEnriching={enrichMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsForm({ 
  settings, 
  onSave, 
  isLoading 
}: { 
  settings: ApolloSettings | undefined; 
  onSave: (updates: Partial<ApolloSettings>) => void;
  isLoading: boolean;
}) {
  const [targetTitles, setTargetTitles] = useState<string[]>(settings?.targetTitles || DEFAULT_TITLES);
  const [targetSeniorities, setTargetSeniorities] = useState<string[]>(settings?.targetSeniorities || ["owner", "founder", "director", "manager"]);
  const [maxContacts, setMaxContacts] = useState(settings?.maxContactsPerCompany || 3);
  const [autoEnrich, setAutoEnrich] = useState(settings?.autoEnrichOnAdd || false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    if (settings) {
      setTargetTitles(settings.targetTitles || DEFAULT_TITLES);
      setTargetSeniorities(settings.targetSeniorities || ["owner", "founder", "director", "manager"]);
      setMaxContacts(settings.maxContactsPerCompany || 3);
      setAutoEnrich(settings.autoEnrichOnAdd || false);
    }
  }, [settings]);

  const handleAddTitle = () => {
    if (newTitle && !targetTitles.includes(newTitle)) {
      setTargetTitles([...targetTitles, newTitle]);
      setNewTitle("");
    }
  };

  const handleRemoveTitle = (title: string) => {
    setTargetTitles(targetTitles.filter(t => t !== title));
  };

  const toggleSeniority = (value: string) => {
    if (targetSeniorities.includes(value)) {
      setTargetSeniorities(targetSeniorities.filter(s => s !== value));
    } else {
      setTargetSeniorities([...targetSeniorities, value]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Target Job Titles</Label>
        <p className="text-xs text-muted-foreground">
          Apollo will look for contacts with these job titles
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {targetTitles.map((title) => (
            <Badge key={title} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTitle(title)}>
              {title} ×
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add a job title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTitle()}
            data-testid="input-new-title"
          />
          <Button type="button" variant="outline" onClick={handleAddTitle} data-testid="button-add-title">
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Target Seniorities</Label>
        <p className="text-xs text-muted-foreground">
          Filter contacts by their seniority level
        </p>
        <div className="flex flex-wrap gap-2">
          {SENIORITY_OPTIONS.map((option) => (
            <Badge
              key={option.value}
              variant={targetSeniorities.includes(option.value) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleSeniority(option.value)}
              data-testid={`badge-seniority-${option.value}`}
            >
              {option.label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxContacts">Max Contacts Per Company</Label>
        <Input
          id="maxContacts"
          type="number"
          min={1}
          max={10}
          value={maxContacts}
          onChange={(e) => setMaxContacts(parseInt(e.target.value) || 3)}
          data-testid="input-max-contacts"
        />
        <p className="text-xs text-muted-foreground">
          Limit how many contacts to enrich per company (saves credits)
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="autoEnrich">Auto-enrich on add</Label>
          <p className="text-xs text-muted-foreground">
            Automatically enrich when adding to CRM
          </p>
        </div>
        <Switch
          id="autoEnrich"
          checked={autoEnrich}
          onCheckedChange={setAutoEnrich}
          data-testid="switch-auto-enrich"
        />
      </div>

      <Button 
        onClick={() => onSave({ targetTitles, targetSeniorities, maxContactsPerCompany: maxContacts, autoEnrichOnAdd: autoEnrich })}
        disabled={isLoading}
        className="w-full"
        data-testid="button-save-settings"
      >
        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Save Settings
      </Button>
    </div>
  );
}

function PreviewDialog({
  contact,
  preview,
  isLoading,
  onEnrich,
  isEnriching,
}: {
  contact: StoreContact | null;
  preview: PreviewResult | null;
  isLoading: boolean;
  onEnrich: () => void;
  isEnriching: boolean;
}) {
  if (!contact) return null;

  return (
    <div className="space-y-4">
      <div className="bg-muted p-4 rounded-lg">
        <h3 className="font-semibold">{contact.name}</h3>
        <p className="text-sm text-muted-foreground">{contact.email || "No email"}</p>
        {contact.website && (
          <p className="text-sm text-muted-foreground">{extractDomain(contact.website)}</p>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Searching Apollo...</p>
        </div>
      ) : preview?.company ? (
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <div className="flex items-start gap-3">
              {preview.company.logo_url && (
                <img 
                  src={preview.company.logo_url} 
                  alt={preview.company.name} 
                  className="h-12 w-12 rounded object-contain bg-white"
                />
              )}
              <div className="flex-1">
                <h4 className="font-semibold flex items-center gap-2">
                  {preview.company.name}
                  {preview.company.linkedin_url && (
                    <a href={preview.company.linkedin_url} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="h-4 w-4 text-blue-600" />
                    </a>
                  )}
                </h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  {preview.company.industry && <p>{preview.company.industry}</p>}
                  {preview.company.estimated_num_employees && (
                    <p>{preview.company.estimated_num_employees} employees</p>
                  )}
                  {(preview.company.city || preview.company.state || preview.company.country) && (
                    <p>
                      {[preview.company.city, preview.company.state, preview.company.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Available Contacts ({preview.totalContacts} total, showing {preview.contacts.length})
            </h4>
            {preview.contacts.length > 0 ? (
              <div className="space-y-2">
                {preview.contacts.map((person) => (
                  <div key={person.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {person.first_name} {person.last_name?.replace(/\*+/g, "***")}
                      </p>
                      <p className="text-sm text-muted-foreground">{person.title}</p>
                      {person.seniority && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {person.seniority}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {person.has_email && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Mail className="h-4 w-4 text-green-600" />
                          </TooltipTrigger>
                          <TooltipContent>Has email</TooltipContent>
                        </Tooltip>
                      )}
                      {person.linkedin_url && (
                        <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="h-4 w-4 text-blue-600" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No contacts found matching your target criteria.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {}}>
              Cancel
            </Button>
            <Button onClick={onEnrich} disabled={isEnriching || preview.contacts.length === 0} data-testid="button-enrich">
              {isEnriching ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Enrich {preview.contacts.length} Contacts
            </Button>
          </div>
        </div>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No matching company found in Apollo. Try with a different domain or company name.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function EnrichedCompaniesTab({ companies, isLoading }: { companies: ApolloCompany[]; isLoading: boolean }) {
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

  const { data: contacts } = useQuery<ApolloContact[]>({
    queryKey: ["/api/apollo/companies", expandedCompany, "contacts"],
    queryFn: async () => {
      if (!expandedCompany) return [];
      const response = await fetch(`/api/apollo/companies/${expandedCompany}/contacts`, {
        credentials: "include",
      });
      return response.json();
    },
    enabled: !!expandedCompany,
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
          <CardHeader 
            className="cursor-pointer hover-elevate" 
            onClick={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {company.logoUrl && (
                  <img 
                    src={company.logoUrl} 
                    alt={company.name || ""} 
                    className="h-10 w-10 rounded object-contain bg-white"
                  />
                )}
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {company.name}
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
              <div className="flex items-center gap-2">
                <Badge variant="outline">{company.creditsUsed} credits</Badge>
                <Badge variant="secondary">
                  {new Date(company.enrichedAt).toLocaleDateString()}
                </Badge>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id} data-testid={`row-enriched-contact-${contact.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {contact.photoUrl && (
                              <img 
                                src={contact.photoUrl} 
                                alt="" 
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            )}
                            <div>
                              <p className="font-medium">{contact.firstName} {contact.lastName}</p>
                              {contact.linkedinUrl && (
                                <a 
                                  href={contact.linkedinUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  LinkedIn
                                </a>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{contact.title}</p>
                            {contact.seniority && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {contact.seniority}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`} className="text-sm text-primary hover:underline">
                              {contact.email}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.phone ? (
                            <a href={`tel:${contact.phone}`} className="text-sm">
                              {contact.phone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={contact.emailStatus === "verified" ? "default" : "secondary"}
                            className={contact.emailStatus === "verified" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : ""}
                          >
                            {contact.emailStatus || "unknown"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-sm">Loading contacts...</p>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
