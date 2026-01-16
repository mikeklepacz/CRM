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
import { useOptionalProject } from "@/contexts/project-context";
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
  Globe,
  ChevronLeft,
  ChevronRight,
  X,
  SkipForward,
  Ban,
  Tag,
  MapPin,
  Factory,
  ChevronDown,
  ChevronUp
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
  contactCount?: number;
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
    industries?: string[];
    keywords?: string[];
    short_description?: string;
    city?: string;
    state?: string;
    country?: string;
    linkedin_url?: string;
    logo_url?: string;
    raw_address?: string;
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
  const projectContext = useOptionalProject();
  const currentProject = projectContext?.currentProject;
  const [activeTab, setActiveTab] = useState("enrich");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<StoreContact | null>(null);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  const [isEnriching, setIsEnriching] = useState(false);
  const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false);
  const [bulkPreviewData, setBulkPreviewData] = useState<Array<{
    contact: StoreContact;
    preview: PreviewResult | null;
    error?: string;
  }>>([]);
  const [bulkPreviewLoading, setBulkPreviewLoading] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set());
  const [reviewQueueOpen, setReviewQueueOpen] = useState(false);
  const [reviewQueueIndex, setReviewQueueIndex] = useState(0);
  const [reviewQueueData, setReviewQueueData] = useState<Array<{
    contact: StoreContact;
    preview: PreviewResult | null;
    error?: string;
  }>>([]);
  const [reviewQueueLoading, setReviewQueueLoading] = useState(false);
  const [reviewSelectedPeople, setReviewSelectedPeople] = useState<Set<string>>(new Set());
  const [keywordsExpanded, setKeywordsExpanded] = useState(false);

  const { data: settings, isLoading: settingsLoading } = useQuery<ApolloSettings>({
    queryKey: ["/api/apollo/settings"],
  });

  const { data: enrichedCompanies, isLoading: companiesLoading } = useQuery<ApolloCompany[]>({
    queryKey: ["/api/apollo/companies"],
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: storeContacts, isLoading: storeLoading } = useQuery<{ contacts: StoreContact[] }>({
    queryKey: ["/api/apollo/leads-without-emails", currentProject?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentProject?.id) {
        params.set("projectId", currentProject.id);
      }
      const response = await fetch(`/api/apollo/leads-without-emails?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch leads");
      return response.json();
    },
    enabled: !!currentProject,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<ApolloSettings>) => {
      return apiRequest("PATCH", "/api/apollo/settings", updates);
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
      return apiRequest("POST", "/api/apollo/preview", { domain, companyName });
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
      return apiRequest("POST", "/api/apollo/enrich", { googleSheetLink, domain, companyName, projectId: currentProject?.id });
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

  const { data: enrichmentStatus } = useQuery<Record<string, string | null>>({
    queryKey: ["/api/apollo/check-enrichment", storeContacts?.contacts?.map(c => c.link)],
    queryFn: async () => {
      const links = storeContacts?.contacts?.map(c => c.link).filter(Boolean) || [];
      if (links.length === 0) return {};
      const response = await apiRequest("POST", "/api/apollo/check-enrichment", { links });
      return response as Record<string, string | null>;
    },
    enabled: !!storeContacts?.contacts?.length,
  });

  const { data: notFoundCompanies, isLoading: notFoundLoading } = useQuery<ApolloCompany[]>({
    queryKey: ["/api/apollo/companies/not-found", currentProject?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentProject?.id) params.set("projectId", currentProject.id);
      const response = await fetch(`/api/apollo/companies/not-found?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch not found companies");
      return response.json();
    },
  });

  const [isPrescreening, setIsPrescreening] = useState(false);
  const [prescreenProgress, setPrescreenProgress] = useState({ current: 0, total: 0 });
  const [prescreenStats, setPrescreenStats] = useState<{ checked: number; found: number; notFound: number } | null>(null);

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
    
    const contacts = storeContacts?.contacts?.filter(c => selectedLinks.has(c.link)) || [];
    
    setBulkPreviewOpen(true);
    setBulkPreviewLoading(true);
    setBulkPreviewData([]);
    setSelectedPeople(new Set());
    
    const results: Array<{ contact: StoreContact; preview: PreviewResult | null; error?: string }> = [];
    
    for (const contact of contacts) {
      try {
        const domain = extractDomain(contact.website);
        const response = await apiRequest("POST", "/api/apollo/preview", {
          domain: domain || undefined,
          companyName: !domain ? contact.name : undefined,
        }) as PreviewResult;
        results.push({ contact, preview: response });
      } catch (error: any) {
        results.push({ contact, preview: null, error: error.message || "Failed to preview" });
      }
      setBulkPreviewData([...results]);
    }
    
    setBulkPreviewLoading(false);
    
    const allPeopleIds = results
      .filter(r => r.preview?.contacts)
      .flatMap(r => r.preview!.contacts.map(c => `${r.contact.link}::${c.id}`));
    setSelectedPeople(new Set(allPeopleIds));
  };

  const handleBulkEnrichSelected = async () => {
    if (selectedPeople.size === 0) {
      toast({ title: "No people selected", variant: "destructive" });
      return;
    }
    
    setIsEnriching(true);
    
    const companyLinks = new Set<string>();
    selectedPeople.forEach(key => {
      const [link] = key.split("::");
      companyLinks.add(link);
    });
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const link of Array.from(companyLinks)) {
      const contactData = storeContacts?.contacts?.find(c => c.link === link);
      if (!contactData) continue;
      
      try {
        const domain = extractDomain(contactData.website);
        await apiRequest("POST", "/api/apollo/enrich", {
          googleSheetLink: contactData.link,
          domain: domain || undefined,
          companyName: !domain ? contactData.name : undefined,
          projectId: currentProject?.id,
        });
        successCount++;
      } catch {
        errorCount++;
      }
    }
    
    setIsEnriching(false);
    setBulkPreviewOpen(false);
    setSelectedLinks(new Set());
    setSelectedPeople(new Set());
    setBulkPreviewData([]);
    queryClient.invalidateQueries({ queryKey: ["/api/apollo/companies"] });
    queryClient.invalidateQueries({ queryKey: ["/api/apollo/check-enrichment"] });
    queryClient.invalidateQueries({ queryKey: ["/api/apollo/settings"] });
    
    toast({
      title: "Bulk enrichment complete",
      description: `Enriched ${successCount} companies. ${errorCount > 0 ? `${errorCount} failed.` : ""}`,
    });
  };

  const handleStartReviewQueue = async () => {
    if (selectedLinks.size === 0) return;
    
    const contacts = storeContacts?.contacts?.filter(c => selectedLinks.has(c.link)) || [];
    
    setReviewQueueOpen(true);
    setReviewQueueLoading(true);
    setReviewQueueData([]);
    setReviewQueueIndex(0);
    setReviewSelectedPeople(new Set());
    setKeywordsExpanded(false);
    
    const results: Array<{ contact: StoreContact; preview: PreviewResult | null; error?: string }> = [];
    
    for (const contact of contacts) {
      try {
        const domain = extractDomain(contact.website);
        const response = await apiRequest("POST", "/api/apollo/preview", {
          domain: domain || undefined,
          companyName: !domain ? contact.name : undefined,
        }) as PreviewResult;
        results.push({ contact, preview: response });
      } catch (error: any) {
        results.push({ contact, preview: null, error: error.message || "Failed to preview" });
      }
      setReviewQueueData([...results]);
    }
    
    setReviewQueueLoading(false);
  };

  const handleReviewTogglePerson = (key: string) => {
    const newSet = new Set(reviewSelectedPeople);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setReviewSelectedPeople(newSet);
  };

  const handleReviewSelectAll = () => {
    const currentItem = reviewQueueData[reviewQueueIndex];
    if (!currentItem?.preview?.contacts) return;
    
    const newSet = new Set(reviewSelectedPeople);
    currentItem.preview.contacts.filter(p => p.has_email).forEach(person => {
      newSet.add(`${currentItem.contact.link}::${person.id}`);
    });
    setReviewSelectedPeople(newSet);
  };

  const handleReviewDeselectAll = () => {
    const currentItem = reviewQueueData[reviewQueueIndex];
    if (!currentItem?.preview?.contacts) return;
    
    const newSet = new Set(reviewSelectedPeople);
    currentItem.preview.contacts.filter(p => p.has_email).forEach(person => {
      newSet.delete(`${currentItem.contact.link}::${person.id}`);
    });
    setReviewSelectedPeople(newSet);
  };

  const handleReviewSkip = () => {
    if (reviewQueueIndex < reviewQueueData.length - 1) {
      setReviewQueueIndex(reviewQueueIndex + 1);
      setKeywordsExpanded(false);
    }
  };

  const handleReviewReject = async () => {
    const currentItem = reviewQueueData[reviewQueueIndex];
    if (!currentItem) return;
    
    toast({
      title: "Company rejected",
      description: `"${currentItem.contact.name}" has been marked as ignored.`,
    });
    
    if (reviewQueueIndex < reviewQueueData.length - 1) {
      setReviewQueueIndex(reviewQueueIndex + 1);
      setKeywordsExpanded(false);
    } else {
      setReviewQueueOpen(false);
    }
  };

  const handleReviewEnrich = async () => {
    const currentItem = reviewQueueData[reviewQueueIndex];
    if (!currentItem) return;
    
    const currentPeopleKeys = (currentItem.preview?.contacts || [])
      .filter(p => p.has_email)
      .map(person => `${currentItem.contact.link}::${person.id}`)
      .filter(key => reviewSelectedPeople.has(key));
    
    if (currentPeopleKeys.length === 0) {
      toast({ title: "No people selected", variant: "destructive" });
      return;
    }
    
    setIsEnriching(true);
    
    try {
      const domain = extractDomain(currentItem.contact.website);
      const selectedPersonIds = currentPeopleKeys.map(key => key.split('::')[1]);
      
      await apiRequest("POST", "/api/apollo/enrich", {
        googleSheetLink: currentItem.contact.link,
        domain: domain || undefined,
        companyName: !domain ? currentItem.contact.name : undefined,
        selectedPersonIds,
        projectId: currentProject?.id,
      });
      
      toast({
        title: "Enrichment complete",
        description: `Successfully enriched contacts for "${currentItem.contact.name}"`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/check-enrichment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/settings"] });
      
      if (reviewQueueIndex < reviewQueueData.length - 1) {
        setReviewQueueIndex(reviewQueueIndex + 1);
        setKeywordsExpanded(false);
      } else {
        setReviewQueueOpen(false);
      }
    } catch (error: any) {
      toast({
        title: "Enrichment failed",
        description: error.message || "Failed to enrich contacts",
        variant: "destructive",
      });
    }
    
    setIsEnriching(false);
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

  const failedEnrichmentLinks = new Set(
    (enrichedCompanies || [])
      .filter(c => c.enrichmentStatus === 'enriched' && (c.contactCount || 0) === 0)
      .map(c => c.googleSheetLink)
  );

  const notEnrichedContacts = filteredContacts.filter(c => {
    const status = enrichmentStatus?.[c.link];
    // Include: not enriched, prescreened, or enriched but with 0 contacts (retry)
    if (failedEnrichmentLinks.has(c.link)) return true;
    return !status || (status !== 'enriched' && status !== 'not_found');
  });

  // For pre-screening, only count contacts that haven't been prescreened yet
  const contactsNeedingPrescreen = notEnrichedContacts.filter(c => {
    const status = enrichmentStatus?.[c.link];
    return !status || status !== 'prescreened';
  });

  const handlePrescreenAll = async () => {
    const contactsToPrescreen = contactsNeedingPrescreen;
    if (contactsToPrescreen.length === 0) {
      toast({ title: "No contacts to pre-screen", variant: "destructive" });
      return;
    }

    setIsPrescreening(true);
    setPrescreenProgress({ current: 0, total: contactsToPrescreen.length });
    setPrescreenStats(null);

    try {
      const response = await apiRequest("POST", "/api/apollo/bulk-prescreen", { 
        contacts: contactsToPrescreen.map(c => ({
          link: c.link,
          website: c.website,
          name: c.name,
        })),
        projectId: currentProject?.id,
      }) as { checked: number; found: number; notFound: number; skipped: number };
      
      setPrescreenStats(response);
      // Invalidate all relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/check-enrichment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/companies/not-found", currentProject?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/leads-without-emails", currentProject?.id] });
      
      const skippedText = response.skipped > 0 ? `, ${response.skipped} already processed` : '';
      toast({ 
        title: "Pre-screening complete", 
        description: `Found ${response.found} in Apollo, ${response.notFound} not found${skippedText}` 
      });
    } catch (error: any) {
      toast({ title: "Pre-screening failed", description: error.message, variant: "destructive" });
    }
    
    setIsPrescreening(false);
  };

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
            {currentProject && <span className="text-primary"> - {currentProject.name}</span>}
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
            Enriched Contacts ({(enrichedCompanies || []).filter(c => (c.contactCount || 0) > 0).length})
          </TabsTrigger>
          <TabsTrigger value="not-found" data-testid="tab-not-found">
            <AlertCircle className="h-4 w-4 mr-2" />
            Not Found ({notFoundCompanies?.length || 0})
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
                  <Button 
                    variant="outline"
                    onClick={handlePrescreenAll}
                    disabled={isPrescreening || contactsNeedingPrescreen.length === 0}
                    data-testid="button-prescreen-all"
                  >
                    {isPrescreening ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Pre-screen All ({contactsNeedingPrescreen.length})
                  </Button>
                  {selectedLinks.size > 0 && (
                    <>
                      <Button 
                        variant="outline"
                        onClick={handleStartReviewQueue}
                        disabled={isEnriching || reviewQueueLoading}
                        data-testid="button-review-queue"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review {selectedLinks.size}
                      </Button>
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
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!currentProject ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please select a project from the top bar to view contacts for enrichment.
                  </AlertDescription>
                </Alert>
              ) : storeLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : notEnrichedContacts.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No contacts to enrich for project "{currentProject.name}". All contacts have been processed.
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
                      {notEnrichedContacts.map((contact) => {
                        const status = enrichmentStatus?.[contact.link];
                        return (
                          <TableRow key={contact.link} data-testid={`row-contact-${contact.link}`}>
                            <TableCell>
                              <Checkbox
                                checked={selectedLinks.has(contact.link)}
                                onCheckedChange={() => toggleSelect(contact.link)}
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
                              {failedEnrichmentLinks.has(contact.link) ? (
                                <Badge variant="destructive">
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Retry
                                </Badge>
                              ) : status === 'prescreened' ? (
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
                                onClick={() => handlePreview(contact)}
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
          <EnrichedCompaniesTab 
            companies={(enrichedCompanies || []).filter(c => (c.contactCount || 0) > 0)} 
            isLoading={companiesLoading} 
          />
        </TabsContent>

        <TabsContent value="not-found" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Companies Not Found in Apollo
              </CardTitle>
              <CardDescription>
                These companies could not be matched in Apollo's database
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notFoundLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !notFoundCompanies || notFoundCompanies.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No companies have been marked as "not found" yet.
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Domain</TableHead>
                        <TableHead>Checked Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notFoundCompanies.map((company) => (
                        <TableRow key={company.id} data-testid={`row-not-found-${company.id}`}>
                          <TableCell>
                            <div className="font-medium">{company.name || "Unknown"}</div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {company.domain || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {new Date(company.enrichedAt).toLocaleDateString()}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
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

      <Dialog open={bulkPreviewOpen} onOpenChange={(open) => {
        if (!open && !isEnriching) {
          setBulkPreviewOpen(false);
          setBulkPreviewData([]);
          setSelectedPeople(new Set());
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Preview Available Contacts</DialogTitle>
            <DialogDescription>
              Select which people you want to enrich from {selectedLinks.size} {selectedLinks.size === 1 ? 'company' : 'companies'}
            </DialogDescription>
          </DialogHeader>
          <BulkPreviewDialog
            data={bulkPreviewData}
            isLoading={bulkPreviewLoading}
            totalCompanies={selectedLinks.size}
            selectedPeople={selectedPeople}
            onTogglePerson={(key) => {
              const newSet = new Set(selectedPeople);
              if (newSet.has(key)) {
                newSet.delete(key);
              } else {
                newSet.add(key);
              }
              setSelectedPeople(newSet);
            }}
            onSelectAll={() => {
              const allPeopleIds = bulkPreviewData
                .filter(r => r.preview?.contacts)
                .flatMap(r => r.preview!.contacts.map(c => `${r.contact.link}::${c.id}`));
              setSelectedPeople(new Set(allPeopleIds));
            }}
            onDeselectAll={() => setSelectedPeople(new Set())}
            onEnrich={handleBulkEnrichSelected}
            isEnriching={isEnriching}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={reviewQueueOpen} onOpenChange={(open) => {
        if (!open && !isEnriching) {
          setReviewQueueOpen(false);
          setReviewQueueData([]);
          setReviewSelectedPeople(new Set());
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Lead Review Queue</DialogTitle>
            <DialogDescription>
              Review companies one at a time, enrich the right ones, reject the wrong ones
            </DialogDescription>
          </DialogHeader>
          <LeadReviewQueue
            data={reviewQueueData}
            currentIndex={reviewQueueIndex}
            onIndexChange={setReviewQueueIndex}
            isLoading={reviewQueueLoading}
            totalCompanies={selectedLinks.size}
            selectedPeople={reviewSelectedPeople}
            onTogglePerson={handleReviewTogglePerson}
            onSelectAll={handleReviewSelectAll}
            onDeselectAll={handleReviewDeselectAll}
            onEnrich={handleReviewEnrich}
            onSkip={handleReviewSkip}
            onReject={handleReviewReject}
            isEnriching={isEnriching}
            keywordsExpanded={keywordsExpanded}
            onToggleKeywords={() => setKeywordsExpanded(!keywordsExpanded)}
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

interface BulkPreviewItem {
  contact: StoreContact;
  preview: PreviewResult | null;
  error?: string;
}

function BulkPreviewDialog({
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
  const allPeople = data.flatMap(item => 
    item.preview?.contacts.map(person => ({
      ...person,
      companyName: item.preview?.company?.name || item.contact.name,
      companyLink: item.contact.link,
      key: `${item.contact.link}::${person.id}`,
    })) || []
  );

  const totalFound = allPeople.length;
  const companiesWithPeople = data.filter(d => d.preview?.contacts && d.preview.contacts.length > 0).length;
  const companiesWithErrors = data.filter(d => d.error).length;
  const companiesNotFound = data.filter(d => !d.preview?.company && !d.error).length;

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
            <div 
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${(data.length / totalCompanies) * 100}%` }}
            />
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
          <Badge variant="secondary">
            {selectedPeople.size} selected
          </Badge>
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
                  {person.seniority ? (
                    <Badge variant="outline" className="text-xs">
                      {person.seniority}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
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
        <Button 
          onClick={onEnrich} 
          disabled={isEnriching || selectedPeople.size === 0}
          data-testid="button-enrich-selected"
        >
          {isEnriching ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Enrich {selectedPeople.size} Selected People
        </Button>
      </div>
    </div>
  );
}

interface LeadReviewQueueProps {
  data: Array<{
    contact: StoreContact;
    preview: PreviewResult | null;
    error?: string;
  }>;
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

function LeadReviewQueue({
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
  keywordsExpanded,
  onToggleKeywords,
}: LeadReviewQueueProps) {
  const currentItem = data[currentIndex];
  const preview = currentItem?.preview;
  const company = preview?.company;
  const allContacts = preview?.contacts || [];
  const contacts = allContacts.filter(p => p.has_email);

  const currentPeopleKeys = contacts.map(person => 
    `${currentItem?.contact.link}::${person.id}`
  );
  const selectedCount = currentPeopleKeys.filter(key => selectedPeople.has(key)).length;

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
          <div 
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${(data.length / totalCompanies) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="py-8 text-center">
        <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-4" />
        <h3 className="font-medium mb-2">Review Complete</h3>
        <p className="text-sm text-muted-foreground">
          You've reviewed all companies in the queue.
        </p>
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
          <Button 
            variant="outline" 
            size="icon"
            disabled={currentIndex === 0}
            onClick={() => onIndexChange(currentIndex - 1)}
            data-testid="button-prev-company"
          >
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
          <AlertDescription>
            "{currentItem.contact.name}" was not found in Apollo.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              {company.logo_url && (
                <img 
                  src={company.logo_url} 
                  alt={company.name}
                  className="w-12 h-12 rounded-lg object-contain bg-muted"
                />
              )}
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

            {company.short_description && (
              <p className="text-sm text-muted-foreground">
                {company.short_description}
              </p>
            )}

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
                  <span>
                    {[company.city, company.state, company.country]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
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
                            <Checkbox
                              checked={selectedPeople.has(personKey)}
                              onCheckedChange={() => onTogglePerson(personKey)}
                            />
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
                            {person.seniority ? (
                              <Badge variant="outline" className="text-xs">
                                {person.seniority}
                              </Badge>
                            ) : "-"}
                          </TableCell>
                          <TableCell>
                            {person.has_email ? (
                              <Mail className="h-4 w-4 text-green-600" />
                            ) : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No contacts found matching your target criteria.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </>
        )}
        </div>
      </ScrollArea>

      <div className="flex justify-between gap-2 pt-4 border-t">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onReject}
            data-testid="button-reject-company"
          >
            <Ban className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onSkip}
            data-testid="button-skip-company"
          >
            <SkipForward className="h-4 w-4 mr-2" />
            Skip
          </Button>
          <Button 
            onClick={onEnrich} 
            disabled={isEnriching || selectedCount === 0}
            data-testid="button-enrich-review"
          >
            {isEnriching ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Enrich {selectedCount} Selected
          </Button>
        </div>
      </div>
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
                <Badge variant={company.contactCount === 0 ? "destructive" : "default"}>
                  {company.contactCount || 0} contacts
                </Badge>
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
