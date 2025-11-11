import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Mail, Plus, Loader2, Upload, Send, Settings, Users, AlertCircle, Database } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { AllContactsResponse, EhubContact } from "@shared/schema";

interface Sequence {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  repliedCount: number;
  createdAt: string;
}

interface EhubSettings {
  id?: string;
  minDelayMinutes: number;
  maxDelayMinutes: number;
  dailyEmailLimit: number;
  sendingHoursStart: number;
  sendingHoursEnd: number;
  promptInjection: string;
  keywordBin: string;
  skipWeekends: boolean;
}

interface Recipient {
  id: string;
  email: string;
  name: string;
  link: string;
  salesSummary: string;
  businessHours: string;
  timezone: string;
  status: string;
  contactedStatus: 'contacted' | 'not contacted' | 'unknown';
  trackerStatus: string | null;
}

export default function EHub() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sheetId, setSheetId] = useState("");
  const [contactedFilter, setContactedFilter] = useState<string>("all"); // 'all' | 'contacted' | 'not contacted' | 'unknown'
  const [activeTab, setActiveTab] = useState("all-contacts");

  // All Contacts tab state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [contactStatusFilter, setContactStatusFilter] = useState<string>('all');

  // Sequence form state
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<EhubSettings>({
    minDelayMinutes: 1,
    maxDelayMinutes: 3,
    dailyEmailLimit: 200,
    sendingHoursStart: 9,
    sendingHoursEnd: 14,
    promptInjection: "",
    keywordBin: "",
    skipWeekends: true,
  });

  // Fetch sequences
  const { data: sequences, isLoading } = useQuery<Sequence[]>({
    queryKey: ['/api/sequences'],
  });

  // Fetch E-Hub settings
  const { data: settings } = useQuery<EhubSettings>({
    queryKey: ['/api/ehub/settings'],
  });

  // Fetch all contacts with pagination and filters
  const { data: allContactsData, isLoading: isLoadingContacts } = useQuery<AllContactsResponse>({
    queryKey: ['/api/ehub/all-contacts', page, debouncedSearch, contactStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', '50');
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }
      if (contactStatusFilter && contactStatusFilter !== 'all') {
        params.append('statusFilter', contactStatusFilter);
      }
      const response = await fetch(`/api/ehub/all-contacts?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      return response.json();
    },
  });

  // Initialize settings form when data loads
  useEffect(() => {
    if (settings) {
      setSettingsForm(settings);
    }
  }, [settings]);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page to 1 when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, contactStatusFilter]);

  // Fetch selected sequence recipients with filter
  const { data: recipients, isLoading: isLoadingRecipients, error: recipientsError } = useQuery<Recipient[]>({
    queryKey: ['/api/sequences', selectedSequenceId, 'recipients', contactedFilter],
    enabled: !!selectedSequenceId,
    queryFn: () => {
      const params = new URLSearchParams();
      if (contactedFilter && contactedFilter !== 'all') {
        params.append('contactedStatus', contactedFilter);
      }
      const url = `/api/sequences/${selectedSequenceId}/recipients?${params.toString()}`;
      return fetch(url).then(res => {
        if (!res.ok) {
          if (res.status === 503) {
            return res.json().then(data => {
              throw new Error(data.message || 'Service unavailable');
            });
          }
          throw new Error('Failed to fetch recipients');
        }
        return res.json();
      });
    },
  });

  // Create sequence mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/sequences', data),
    onSuccess: () => {
      toast({
        title: "Sequence Created",
        description: "Your email sequence has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sequences'] });
      setIsCreateDialogOpen(false);
      resetSequenceForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create sequence",
        variant: "destructive",
      });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<EhubSettings>) => apiRequest('PATCH', '/api/ehub/settings', data),
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "E-Hub settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Import recipients mutation
  const importMutation = useMutation({
    mutationFn: ({ sequenceId, sheetId }: { sequenceId: string; sheetId: string }) =>
      apiRequest('POST', `/api/sequences/${sequenceId}/recipients`, { sheetId }),
    onSuccess: (data: any, variables) => {
      toast({
        title: "Import Complete",
        description: `${data.count} recipients imported successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sequences'] });
      // Invalidate all recipients queries for the imported sequence (all filters)
      // Use variables.sequenceId to avoid race conditions if user switches sequences
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === '/api/sequences' && 
          query.queryKey[1] === variables.sequenceId &&
          query.queryKey[2] === 'recipients'
      });
      setIsImportDialogOpen(false);
      setSheetId("");
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import recipients",
        variant: "destructive",
      });
    },
  });

  // Test send mutation
  const testSendMutation = useMutation({
    mutationFn: ({ sequenceId, testEmail }: { sequenceId: string; testEmail: string }) =>
      apiRequest('POST', `/api/sequences/${sequenceId}/test-send`, { testEmail }),
    onSuccess: (data: any) => {
      toast({
        title: "Test Email Sent",
        description: data.message || `Test email sent to ${testEmail}`,
      });
      setIsTestDialogOpen(false);
      setTestEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    },
  });

  const resetSequenceForm = () => {
    setName("");
    setSubject("");
    setBody("");
  };

  const handleCreateSequence = () => {
    createMutation.mutate({
      name,
      subject,
      body,
    });
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settingsForm);
  };

  const handleImport = () => {
    if (!selectedSequenceId) return;
    importMutation.mutate({ sequenceId: selectedSequenceId, sheetId });
  };

  const handleTestSend = () => {
    if (!selectedSequenceId) return;
    testSendMutation.mutate({ sequenceId: selectedSequenceId, testEmail });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'paused':
        return 'secondary';
      case 'completed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">E-Hub</h1>
          <p className="text-muted-foreground">Email sequence automation system</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="all-contacts" data-testid="tab-all-contacts">
            <Database className="w-4 h-4 mr-2" />
            All Contacts
          </TabsTrigger>
          <TabsTrigger value="sequences" data-testid="tab-sequences">
            <Mail className="w-4 h-4 mr-2" />
            Sequences
          </TabsTrigger>
          <TabsTrigger value="recipients" data-testid="tab-recipients">
            <Users className="w-4 h-4 mr-2" />
            Recipients
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* All Contacts Tab */}
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
                <div className="text-center py-8 text-muted-foreground">
                  No contacts found
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                      {allContactsData.contacts.map((contact) => (
                        <TableRow key={contact.email} data-testid={`row-contact-${contact.email}`}>
                          <TableCell className="font-medium">{contact.name}</TableCell>
                          <TableCell>{contact.email}</TableCell>
                          <TableCell>{contact.state || '—'}</TableCell>
                          <TableCell>{contact.hours || '—'}</TableCell>
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
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="max-w-md truncate">
                            {contact.salesSummary || '—'}
                          </TableCell>
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
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-muted-foreground">
                      Page {page} of {Math.ceil((allContactsData?.total || 0) / 50) || 1}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        data-testid="button-prev-page"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= Math.ceil((allContactsData?.total || 0) / 50)}
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
        </TabsContent>

        {/* Sequences Tab */}
        <TabsContent value="sequences" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-sequence">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Sequence
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Email Sequence</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">Sequence Name</Label>
                    <Input
                      id="name"
                      data-testid="input-sequence-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Cold Outreach Q1 2025"
                    />
                  </div>
                  <div>
                    <Label htmlFor="subject">Email Subject</Label>
                    <Input
                      id="subject"
                      data-testid="input-sequence-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g., Partnership Opportunity"
                    />
                  </div>
                  <div>
                    <Label htmlFor="body">Email Body</Label>
                    <Textarea
                      id="body"
                      data-testid="input-sequence-body"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Write your email template here..."
                      rows={6}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateSequence}
                    disabled={!name || !subject || !body || createMutation.isPending}
                    data-testid="button-submit-create"
                  >
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Sequence
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {sequences && sequences.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Sequences Yet</CardTitle>
                <CardDescription>
                  Create your first email sequence to get started with automated outreach.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Sequences</CardTitle>
                <CardDescription>Manage your email sequences</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Replies</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sequences?.map((sequence) => (
                      <TableRow 
                        key={sequence.id} 
                        data-testid={`row-sequence-${sequence.id}`}
                        className="cursor-pointer hover-elevate"
                        onClick={() => {
                          setSelectedSequenceId(sequence.id);
                          setActiveTab("recipients");
                        }}
                      >
                        <TableCell className="font-medium">{sequence.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{sequence.subject}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(sequence.status)}>
                            {sequence.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{sequence.totalRecipients || 0}</TableCell>
                        <TableCell>{sequence.sentCount || 0}</TableCell>
                        <TableCell>{sequence.repliedCount || 0}</TableCell>
                        <TableCell>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSequenceId(sequence.id);
                                setIsImportDialogOpen(true);
                              }}
                              data-testid={`button-import-${sequence.id}`}
                            >
                              <Upload className="w-4 h-4 mr-1" />
                              Import
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSequenceId(sequence.id);
                                setIsTestDialogOpen(true);
                              }}
                              data-testid={`button-test-${sequence.id}`}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Test
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Recipients Tab */}
        <TabsContent value="recipients" className="space-y-4">
          {!selectedSequenceId ? (
            <Card>
              <CardHeader>
                <CardTitle>No Sequence Selected</CardTitle>
                <CardDescription>
                  Select a sequence from the Sequences tab to view its recipients.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : recipientsError ? (
            <Alert variant="destructive" data-testid="alert-recipients-error">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Commission Tracker Error</AlertTitle>
              <AlertDescription>
                {(recipientsError as Error).message || 'Failed to load recipients. Please check your Commission Tracker configuration.'}
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recipients</CardTitle>
                    <CardDescription>
                      Sequence recipients with Commission Tracker status
                    </CardDescription>
                  </div>
                  <ToggleGroup 
                    type="single" 
                    value={contactedFilter} 
                    onValueChange={(value) => value && setContactedFilter(value)}
                    data-testid="filter-contacted-status"
                  >
                    <ToggleGroupItem value="all" data-testid="filter-all">
                      All {recipients && `(${recipients.length})`}
                    </ToggleGroupItem>
                    <ToggleGroupItem value="contacted" data-testid="filter-contacted">
                      Contacted
                    </ToggleGroupItem>
                    <ToggleGroupItem value="not contacted" data-testid="filter-not-contacted">
                      Not Contacted
                    </ToggleGroupItem>
                    <ToggleGroupItem value="unknown" data-testid="filter-unknown">
                      Unknown
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingRecipients ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : !recipients || recipients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No recipients found{contactedFilter !== 'all' ? ` with status "${contactedFilter}"` : ''}.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Link</TableHead>
                        <TableHead>Tracker Status</TableHead>
                        <TableHead>Contacted</TableHead>
                        <TableHead>Sales Summary</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipients.map((recipient) => (
                        <TableRow key={recipient.id} data-testid={`row-recipient-${recipient.id}`}>
                          <TableCell className="font-medium">{recipient.name}</TableCell>
                          <TableCell>{recipient.email}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            <a 
                              href={recipient.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {recipient.link}
                            </a>
                          </TableCell>
                          <TableCell>
                            {recipient.trackerStatus ? (
                              <Badge variant="outline">{recipient.trackerStatus}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                recipient.contactedStatus === 'contacted' 
                                  ? 'default' 
                                  : recipient.contactedStatus === 'unknown'
                                  ? 'secondary'
                                  : 'outline'
                              }
                              data-testid={`badge-contacted-${recipient.contactedStatus}`}
                            >
                              {recipient.contactedStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-md truncate">{recipient.salesSummary || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global E-Hub Settings</CardTitle>
              <CardDescription>
                Configure system-wide settings for email sending, AI personalization, and automation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Sending Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minDelay">Min Delay Between Sends (minutes)</Label>
                    <Input
                      id="minDelay"
                      data-testid="input-settings-min-delay"
                      type="number"
                      value={settingsForm.minDelayMinutes}
                      onChange={(e) => setSettingsForm({ ...settingsForm, minDelayMinutes: parseInt(e.target.value) || 1 })}
                      min={1}
                      max={60}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxDelay">Max Delay Between Sends (minutes)</Label>
                    <Input
                      id="maxDelay"
                      data-testid="input-settings-max-delay"
                      type="number"
                      value={settingsForm.maxDelayMinutes}
                      onChange={(e) => setSettingsForm({ ...settingsForm, maxDelayMinutes: parseInt(e.target.value) || 3 })}
                      min={1}
                      max={120}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="dailyLimit">Daily Email Limit</Label>
                  <Input
                    id="dailyLimit"
                    data-testid="input-settings-daily-limit"
                    type="number"
                    value={settingsForm.dailyEmailLimit}
                    onChange={(e) => setSettingsForm({ ...settingsForm, dailyEmailLimit: parseInt(e.target.value) || 200 })}
                    min={1}
                    max={2000}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Maximum emails sent per day (Gmail limit: 500-2000/day)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startHour">Sending Hours Start (24h format)</Label>
                    <Input
                      id="startHour"
                      data-testid="input-settings-start-hour"
                      type="number"
                      value={settingsForm.sendingHoursStart}
                      onChange={(e) => setSettingsForm({ ...settingsForm, sendingHoursStart: parseInt(e.target.value) || 9 })}
                      min={0}
                      max={23}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endHour">Sending Hours End (24h format)</Label>
                    <Input
                      id="endHour"
                      data-testid="input-settings-end-hour"
                      type="number"
                      value={settingsForm.sendingHoursEnd}
                      onChange={(e) => setSettingsForm({ ...settingsForm, sendingHoursEnd: parseInt(e.target.value) || 14 })}
                      min={0}
                      max={23}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="skipWeekends">Skip Weekends</Label>
                    <p className="text-sm text-muted-foreground">
                      Don't send emails on Saturday and Sunday
                    </p>
                  </div>
                  <Switch
                    id="skipWeekends"
                    data-testid="switch-skip-weekends"
                    checked={settingsForm.skipWeekends}
                    onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, skipWeekends: checked })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">AI Personalization</h3>
                <div>
                  <Label htmlFor="promptInjection">AI Prompt Injection</Label>
                  <Textarea
                    id="promptInjection"
                    data-testid="input-settings-prompt"
                    value={settingsForm.promptInjection}
                    onChange={(e) => setSettingsForm({ ...settingsForm, promptInjection: e.target.value })}
                    placeholder="Custom AI instructions for email personalization..."
                    rows={4}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Global AI instructions used to personalize all outreach emails
                  </p>
                </div>

                <div>
                  <Label htmlFor="keywordBin">Keyword Bin</Label>
                  <Textarea
                    id="keywordBin"
                    data-testid="input-settings-keywords"
                    value={settingsForm.keywordBin}
                    onChange={(e) => setSettingsForm({ ...settingsForm, keywordBin: e.target.value })}
                    placeholder="Context keywords for AI (comma-separated)..."
                    rows={3}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Additional context keywords to help AI understand your business
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMutation.isPending}
                  data-testid="button-save-settings"
                >
                  {updateSettingsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Recipients Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Recipients from Google Sheets</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="sheetId">Google Sheet ID</Label>
              <Input
                id="sheetId"
                data-testid="input-sheet-id"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                placeholder="Paste Google Sheet ID here"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Emails will be imported from Column K (auto-deduplication enabled)
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(false)}
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!sheetId || importMutation.isPending}
              data-testid="button-submit-import"
            >
              {importMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Import Recipients
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Send Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="testEmail">Test Email Address</Label>
              <Input
                id="testEmail"
                data-testid="input-test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your.email@example.com"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsTestDialogOpen(false)}
              data-testid="button-cancel-test"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTestSend}
              disabled={!testEmail || testSendMutation.isPending}
              data-testid="button-submit-test"
            >
              {testSendMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Test
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
