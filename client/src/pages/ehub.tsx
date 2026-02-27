import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Plus, Loader2, Upload, Send, AlertCircle, Bot, User as UserIcon, Check, X, Trash2, MoreVertical, Pause, SkipForward, Clock, Play, Edit, Sparkles, Store, CheckCircle2, XCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { AllContactsResponse, EhubContact } from "@shared/schema";
import { TestTube2, RefreshCw, Reply } from "lucide-react";
import { useOptionalProject } from "@/contexts/project-context";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useLocation } from "wouter";
import { canAccessAdminFeatures } from "@/lib/authUtils";
import { EhubBulkDeleteRecipientsDialog } from "@/components/ehub/ehub-bulk-delete-recipients-dialog";
import { EhubModuleDisabled } from "@/components/ehub/ehub-module-disabled";
import { EhubMainTabs } from "@/components/ehub/ehub-main-tabs";
import { EhubDialogsSection } from "@/components/ehub/ehub-dialogs-section";
import {
  type EhubSettings,
  type EmailAccount,
  type Recipient,
  type Sequence,
  type TestEmailSend,
} from "@/components/ehub/ehub.types";

export default function EHub() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { isModuleEnabled, isLoading: moduleAccessLoading } = useModuleAccess();
  const projectContext = useOptionalProject();
  const currentProject = projectContext?.currentProject;
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const moduleEnabled = isModuleEnabled("ehub");

  if (!moduleAccessLoading && !moduleEnabled) {
    return <EhubModuleDisabled onReturnHome={() => setLocation("/")} />;
  }
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sheetId, setSheetId] = useState("");
  const [contactedFilter, setContactedFilter] = useState<string>("all"); // 'all' | 'contacted' | 'not contacted' | 'unknown'
  const [activeTab, setActiveTab] = useState("all-contacts");
  
  // Navigation guard for unsaved settings changes
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showNavigationWarning, setShowNavigationWarning] = useState(false);
  
  // Strategy chat state
  const [strategyMessage, setStrategyMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [stepDelays, setStepDelays] = useState<number[]>([]);
  const [repeatLastStep, setRepeatLastStep] = useState<boolean>(false);
  const [sequenceKeywords, setSequenceKeywords] = useState<string>("");
  
  // Step template editing state
  const [editStepDialogOpen, setEditStepDialogOpen] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editStepSubject, setEditStepSubject] = useState("");
  const [editStepBody, setEditStepBody] = useState("");
  const [editStepGuidance, setEditStepGuidance] = useState("");

  // All Contacts tab state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [contactStatusFilter, setContactStatusFilter] = useState<string>('all');
  const [selectedContacts, setSelectedContacts] = useState<EhubContact[]>([]);
  const [selectAllMode, setSelectAllMode] = useState<'none' | 'page' | 'all'>('none');
  const [isAddToSequenceDialogOpen, setIsAddToSequenceDialogOpen] = useState(false);
  const [targetSequenceId, setTargetSequenceId] = useState<string>('');
  const [deleteSequenceId, setDeleteSequenceId] = useState<string | null>(null);

  // Recipients bulk actions state
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set());
  const [recipientSelectAll, setRecipientSelectAll] = useState(false);
  const [bulkDeleteConfirmDialogOpen, setBulkDeleteConfirmDialogOpen] = useState(false);

  // Sequence form state
  const [name, setName] = useState("");
  const [senderEmailAccountId, setSenderEmailAccountId] = useState<string | null>(null);

  // Test Email state
  const [testRecipientEmail, setTestRecipientEmail] = useState("");
  const [testSubject, setTestSubject] = useState("");
  const [testBody, setTestBody] = useState("");
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [selectedTestEmailId, setSelectedTestEmailId] = useState<string | null>(null);
  const [followUpSubject, setFollowUpSubject] = useState("");
  const [followUpBody, setFollowUpBody] = useState("");

  // Nuke Test Data state
  const [nukeDialogOpen, setNukeDialogOpen] = useState(false);
  const [nukeCounts, setNukeCounts] = useState<{
    recipientsCount: number;
    messagesCount: number;
    testEmailsCount: number;
    slotsCount: number;
  } | null>(null);
  const [nukeEmailPattern, setNukeEmailPattern] = useState("");
  const [nukeConfirmText, setNukeConfirmText] = useState("");
  const [countsError, setCountsError] = useState<string | null>(null);

  // Reply Scanner state
  const [replyScannnerDialogOpen, setReplyScannerDialogOpen] = useState(false);
  const [scanPreviewResults, setScanPreviewResults] = useState<{
    scanned: number;
    promoted: number;
    errors: number;
    dryRun?: boolean;
    details: Array<{
      recipientId: string;
      email: string;
      status: 'promoted' | 'has_reply' | 'too_recent' | 'error' | 'newly_enrolled' | 'blacklisted';
      message?: string;
      isNew?: boolean;
    }>;
  } | null>(null);
  const [selectedScanEmails, setSelectedScanEmails] = useState<Set<string>>(new Set());

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<EhubSettings>({
    minDelayMinutes: 1,
    maxDelayMinutes: 3,
    jitterPercentage: 50,
    dailyEmailLimit: 200,
    sendingHoursStart: 9,
    sendingHoursEnd: 14,
    clientWindowStartOffset: 1.0,
    clientWindowEndHour: 14,
    promptInjection: "",
    keywordBin: "",
    excludedDays: [],
  });
  
  // Track original settings for dirty state detection
  const [originalSettings, setOriginalSettings] = useState<EhubSettings | null>(null);
  
  // Check if settings form has unsaved changes
  const isSettingsDirty = originalSettings && JSON.stringify(settingsForm) !== JSON.stringify(originalSettings);

  // Finalize Strategy state - track if textarea has been edited
  const [finalizedStrategyEdit, setFinalizedStrategyEdit] = useState("");

  // Synthetic Email Series Test state
  const [syntheticPreview, setSyntheticPreview] = useState<Array<{stepNumber: number; subject: string; body: string}> | null>(null);
  const [syntheticStoreContext, setSyntheticStoreContext] = useState<{
    name: string;
    link: string | null;
    salesSummary: string | null;
    state: string | null;
    timezone: string;
  } | null>(null);

  // Fetch sequences
  const { data: sequences, isLoading } = useQuery<Sequence[]>({
    queryKey: ['/api/sequences', currentProject?.id],
    queryFn: async () => {
      const url = new URL('/api/sequences', window.location.origin);
      if (currentProject?.id) {
        url.searchParams.set('projectId', currentProject.id);
      }
      const response = await fetch(url.toString(), { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch sequences');
      return response.json();
    },
  });

  // Fetch user preferences for blacklist toggle
  const { data: userPreferences } = useQuery<{ blacklistCheckEnabled?: boolean }>({
    queryKey: ['/api/user/preferences'],
  });

  // Fetch integration status to check Gmail connection
  const { data: integrationStatus } = useQuery<{ googleCalendarConnected?: boolean }>({
    queryKey: ['/api/integrations/status'],
  });
  const gmailConnected = integrationStatus?.googleCalendarConnected;

  // Fetch E-Hub settings
  const { data: settings } = useQuery<EhubSettings>({
    queryKey: ['/api/ehub/settings'],
  });

  // Fetch email accounts
  const { data: emailAccounts, isLoading: isLoadingEmailAccounts } = useQuery<EmailAccount[]>({
    queryKey: ['/api/email-accounts'],
  });

  // Delete email account mutation
  const deleteEmailAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/email-accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-accounts'] });
      toast({ title: 'Email Disconnected', description: 'The email account has been removed' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to disconnect email', variant: 'destructive' });
    },
  });

  // Connect email account handler
  const handleConnectEmail = async () => {
    try {
      const res = await fetch('/api/email-accounts/oauth-url', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to get OAuth URL');
      const { url } = await res.json();
      const popup = window.open(url, 'Connect Gmail', 'width=600,height=700');
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          queryClient.invalidateQueries({ queryKey: ['/api/email-accounts'] });
        }
      }, 1000);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to connect email', variant: 'destructive' });
    }
  };

  // Fetch upcoming blocked days (holidays) for holiday summary
  const { data: upcomingBlockedDays } = useQuery<{ date: string; reason: string }[]>({
    queryKey: ['/api/no-send-dates/upcoming'],
  });

  // Fetch all contacts with pagination and filters
  const { data: allContactsData, isLoading: isLoadingContacts } = useQuery<AllContactsResponse>({
    queryKey: ['/api/ehub/all-contacts', page, debouncedSearch, contactStatusFilter, currentProject?.id],
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
      if (currentProject?.id) {
        params.append('projectId', currentProject.id);
      }
      const response = await fetch(`/api/ehub/all-contacts?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      return response.json();
    },
  });

  // Fetch strategy chat transcript for selected sequence
  const { data: strategyTranscript } = useQuery({
    queryKey: ['/api/sequences', selectedSequenceId, 'strategy-chat'],
    enabled: !!selectedSequenceId,
    queryFn: async () => {
      const response = await fetch(`/api/sequences/${selectedSequenceId}/strategy-chat`);
      if (!response.ok) throw new Error('Failed to fetch strategy chat');
      return response.json();
    },
  });

  // Fetch test email history
  const { data: testEmailHistory, isLoading: isLoadingTestEmails } = useQuery<TestEmailSend[]>({
    queryKey: ['/api/test-email/history'],
    enabled: activeTab === 'test-emails' && canAccessAdminFeatures(user),
  });

  // Derive current sequence to check for finalized strategy
  const currentSequence = sequences?.find(s => s.id === selectedSequenceId);

  // Generate finalized strategy mutation
  const generateFinalizedStrategyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/sequences/${selectedSequenceId}/finalize-strategy`);
    },
    onSuccess: (data: any) => {
      setFinalizedStrategyEdit(data.finalizedStrategy);
      saveFinalizedStrategyMutation.mutate(data.finalizedStrategy);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate strategy brief",
        variant: "destructive",
      });
    },
  });

  // Save finalized strategy mutation
  const saveFinalizedStrategyMutation = useMutation({
    mutationFn: async (text: string) => {
      return await apiRequest("PATCH", `/api/sequences/${selectedSequenceId}/finalized-strategy`, 
        { finalizedStrategy: text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sequences'] });
      toast({
        title: "Success",
        description: "Campaign strategy saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save strategy",
        variant: "destructive",
      });
    },
  });

  // Send strategy chat message mutation
  const sendStrategyChatMutation = useMutation({
    mutationFn: async (message: string) => {
      return await apiRequest("POST", `/api/sequences/${selectedSequenceId}/strategy-chat`, { message });
    },
    onSuccess: () => {
      setStrategyMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/sequences', selectedSequenceId, 'strategy-chat'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Save step delays mutation
  const saveStepDelaysMutation = useMutation({
    mutationFn: async (data: { stepDelays: number[], repeatLastStep: boolean }) => {
      return await apiRequest("PUT", `/api/sequences/${selectedSequenceId}/step-delays`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sequences'] });
      toast({
        title: "Success",
        description: "Step delays saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save step delays",
        variant: "destructive",
      });
    },
  });

  // Save sequence keywords mutation
  const saveKeywordsMutation = useMutation({
    mutationFn: async (keywords: string) => {
      return await apiRequest("PUT", `/api/sequences/${selectedSequenceId}/keywords`, { keywords });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sequences'] });
      toast({
        title: "Success",
        description: "Keywords saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save keywords",
        variant: "destructive",
      });
    },
  });

  // Fetch sequence steps for template editing
  const { data: sequenceSteps, refetch: refetchSteps } = useQuery<Array<{
    id: string;
    stepNumber: number;
    delayDays: string;
    subjectTemplate: string | null;
    bodyTemplate: string | null;
    aiGuidance: string | null;
  }>>({
    queryKey: ['/api/sequences', selectedSequenceId, 'steps'],
    queryFn: async () => {
      if (!selectedSequenceId) return [];
      const res = await fetch(`/api/sequences/${selectedSequenceId}/steps`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch steps');
      return res.json();
    },
    enabled: !!selectedSequenceId,
  });

  // Update step template mutation
  const updateStepTemplateMutation = useMutation({
    mutationFn: async ({ stepId, subjectTemplate, bodyTemplate, aiGuidance }: {
      stepId: string;
      subjectTemplate?: string | null;
      bodyTemplate?: string | null;
      aiGuidance?: string | null;
    }) => {
      return await apiRequest("PATCH", `/api/sequences/${selectedSequenceId}/steps/${stepId}`, {
        subjectTemplate,
        bodyTemplate,
        aiGuidance,
      });
    },
    onSuccess: () => {
      refetchSteps();
      setEditStepDialogOpen(false);
      toast({
        title: "Success",
        description: "Step template saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save step template",
        variant: "destructive",
      });
    },
  });

  // Update sequence status mutation
  const updateSequenceStatusMutation = useMutation({
    mutationFn: async ({ sequenceId, status }: { sequenceId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/sequences/${sequenceId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sequences'] });
      // Invalidate all queue queries regardless of search/filter parameters
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === '/api/ehub/queue'
      });
      toast({
        title: "Success",
        description: "Sequence status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update sequence status",
        variant: "destructive",
      });
    },
  });

  // Update sequence sender email mutation (auto-save)
  const updateSequenceSenderMutation = useMutation({
    mutationFn: async ({ sequenceId, senderEmailAccountId }: { sequenceId: string; senderEmailAccountId: string | null }) => {
      return await apiRequest("PATCH", `/api/sequences/${sequenceId}`, { senderEmailAccountId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sequences'] });
      toast({
        title: "Saved",
        description: "Sender email updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update sender email",
        variant: "destructive",
      });
    },
  });

  // Scan for replies mutation
  const scanRepliesMutation = useMutation({
    mutationFn: async ({ dryRun, selectedEmails }: { dryRun: boolean; selectedEmails?: string[] }) => {
      return await apiRequest("POST", `/api/ehub/scan-replies`, { dryRun, selectedEmails });
    },
    onSuccess: (data: any) => {
      if (data.dryRun) {
        setScanPreviewResults(data);
        // Auto-select all enrollable emails (not blacklisted, not has_reply)
        const enrollable = data.details
          .filter((d: any) => d.status === 'newly_enrolled' || d.status === 'promoted')
          .map((d: any) => d.email);
        setSelectedScanEmails(new Set(enrollable));
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/sequences'] });
        queryClient.invalidateQueries({ 
          predicate: (query) => query.queryKey[0] === '/api/ehub/queue'
        });
        // Invalidate recipients queries for all sequences to show newly enrolled contacts
        queryClient.invalidateQueries({ 
          predicate: (query) => 
            query.queryKey[0] === '/api/sequences' && 
            query.queryKey[2] === 'recipients'
        });
        
        const newEnrolled = data.newEnrollments || 0;
        const promoted = data.promoted || 0;
        
        toast({
          title: "Enrollment Complete",
          description: `Enrolled ${newEnrolled} new contacts at Step 0. Promoted ${promoted} to Step 1 for AI follow-ups.`,
        });
        setReplyScannerDialogOpen(false);
        setScanPreviewResults(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to scan for replies",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when transcript changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [strategyTranscript]);

  // Sync edit state when sequence changes or data loads
  useEffect(() => {
    const current = sequences?.find(s => s.id === selectedSequenceId);
    setFinalizedStrategyEdit((current as any)?.finalizedStrategy || "");
  }, [selectedSequenceId, sequences]);

  // Load step delays and repeat checkbox when sequence changes
  useEffect(() => {
    if (selectedSequenceId && sequences) {
      const selectedSeq = sequences.find((s) => s.id === selectedSequenceId);
      if (selectedSeq && (selectedSeq as any).stepDelays) {
        setStepDelays((selectedSeq as any).stepDelays);
        setRepeatLastStep((selectedSeq as any).repeatLastStep || false);
      } else {
        setStepDelays([]);
        setRepeatLastStep(false);
      }
      // Load keywords for this sequence (handle both string and array from DB)
      const kw = (selectedSeq as any)?.keywords;
      setSequenceKeywords(Array.isArray(kw) ? kw.join(', ') : (kw || ""));
    } else {
      setStepDelays([]);
      setRepeatLastStep(false);
      setSequenceKeywords("");
    }
  }, [selectedSequenceId, sequences]);

  // Initialize settings form when data loads
  useEffect(() => {
    if (settings) {
      setSettingsForm(settings);
      setOriginalSettings(settings);
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

  // Reset synthetic preview when sequence changes
  useEffect(() => {
    setSyntheticPreview(null);
  }, [selectedSequenceId]);

  // Fetch nuke counts when dialog opens or email pattern changes
  useEffect(() => {
    if (nukeDialogOpen) {
      const params = new URLSearchParams();
      if (nukeEmailPattern) {
        params.append('emailPattern', nukeEmailPattern);
      }
      const url = `/api/ehub/test-data/nuke/counts?${params.toString()}`;
      
      fetch(url)
        .then(res => res.json())
        .then(data => {
          setNukeCounts(data);
          setCountsError(null);
        })
        .catch(() => {
          setCountsError('Failed to fetch counts');
        });
    }
  }, [nukeDialogOpen, nukeEmailPattern]);

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
    mutationFn: (data: any) => apiRequest('POST', '/api/sequences', {
      ...data,
      projectId: currentProject?.id,
    }),
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

  // Delete sequence mutation
  const deleteMutation = useMutation({
    mutationFn: (sequenceId: string) => apiRequest('DELETE', `/api/sequences/${sequenceId}`),
    onSuccess: (_, sequenceId) => {
      toast({
        title: "Sequence Deleted",
        description: "The sequence and all its data have been permanently deleted.",
      });
      // Invalidate sequences list
      queryClient.invalidateQueries({ queryKey: ['/api/sequences'] });
      // Invalidate all queries for the deleted sequence (recipients, strategy chat)
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === '/api/sequences' && 
          query.queryKey[1] === sequenceId
      });
      setDeleteSequenceId(null);
      if (selectedSequenceId === deleteSequenceId) {
        setSelectedSequenceId(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete sequence",
        variant: "destructive",
      });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<EhubSettings>) => apiRequest('PATCH', '/api/ehub/settings', data),
    onSuccess: async () => {
      toast({
        title: "Settings Updated",
        description: "Queue is being rescheduled with new settings. Coordinator will pick up changes on next tick.",
      });
      // Invalidate and refetch settings to ensure we have the latest values
      await queryClient.invalidateQueries({ queryKey: ['/api/ehub/settings'] });
      // The useEffect will automatically update both settingsForm and originalSettings when settings refetches
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Update blacklist preference mutation
  const updateBlacklistPreferenceMutation = useMutation({
    mutationFn: (enabled: boolean) => apiRequest('PUT', '/api/user/preferences', { blacklistCheckEnabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
      toast({
        title: "Blacklist Check " + (userPreferences?.blacklistCheckEnabled ? "Disabled" : "Enabled"),
        description: userPreferences?.blacklistCheckEnabled 
          ? "Blacklist checking is now OFF (for testing)"
          : "Blacklist checking is now ON",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update preference",
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

  // Test Email Sending Mutations
  const sendTestEmailMutation = useMutation({
    mutationFn: (payload: { recipientEmail: string; subject: string; body: string }) => 
      apiRequest('POST', '/api/test-email/send', payload),
    onSuccess: () => {
      toast({ 
        title: "Test Email Sent",
        description: "Your test email has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/test-email/history'] });
      setTestRecipientEmail("");
      setTestSubject("");
      setTestBody("");
    },
    onError: (error: any) => {
      if (error.status === 429) {
        toast({ 
          title: "Rate Limit Exceeded", 
          description: "Maximum 10 test emails per hour. Please wait before sending another.",
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Send Failed", 
          description: error.message || "Unable to send test email",
          variant: "destructive" 
        });
      }
    },
  });

  const checkReplyMutation = useMutation({
    mutationFn: (id: string) => apiRequest('GET', `/api/test-email/check-reply/${id}`),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/test-email/history'] });
      toast({
        title: data.hasReply ? "Reply Detected" : "No Reply Yet",
        description: data.hasReply 
          ? `Found ${data.replyCount} ${data.replyCount === 1 ? 'reply' : 'replies'}`
          : "This email has not received any replies.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Check Failed",
        description: error.message || "Unable to check for replies",
        variant: "destructive",
      });
    },
  });

  const sendFollowUpMutation = useMutation({
    mutationFn: ({ id, subject, body }: { id: string; subject: string; body: string }) =>
      apiRequest('POST', `/api/test-email/send-followup/${id}`, { subject, body }),
    onSuccess: () => {
      toast({ 
        title: "Follow-up Sent",
        description: "Your threaded follow-up has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/test-email/history'] });
      setFollowUpDialogOpen(false);
      setSelectedTestEmailId(null);
      setFollowUpSubject("");
      setFollowUpBody("");
    },
    onError: (error: any) => {
      toast({
        title: "Follow-up Failed",
        description: error.message || "Unable to send follow-up",
        variant: "destructive",
      });
    },
  });

  // Synthetic Email Series Test mutation
  const syntheticTestMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/ehub/sequences/${selectedSequenceId}/synthetic-test`),
    onSuccess: (data: { 
      emails: Array<{stepNumber: number; subject: string; body: string}>;
      storeContext: {
        name: string;
        link: string | null;
        salesSummary: string | null;
        state: string | null;
        timezone: string;
      };
    }) => {
      setSyntheticPreview(data.emails);
      setSyntheticStoreContext(data.storeContext);
      toast({
        title: "Test Sequence Generated",
        description: `Generated ${data.emails.length} email previews using: ${data.storeContext.name}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Generation Failed",
        description: error.message || "Unable to generate synthetic emails",
        variant: "destructive",
      });
    },
  });

  // Bulk delete recipients mutation
  const bulkDeleteRecipientsMutation = useMutation({
    mutationFn: (recipientIds: string[]) =>
      apiRequest('POST', '/api/ehub/recipients/bulk-delete', { recipientIds }),
    onSuccess: (data: any) => {
      toast({
        title: "Recipients Deleted",
        description: `Deleted ${data.deleted} recipient(s)${data.failed > 0 ? ` (${data.failed} failed)` : ''}.`,
      });
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === '/api/sequences' && 
          query.queryKey[2] === 'recipients'
      });
      setSelectedRecipientIds(new Set());
      setRecipientSelectAll(false);
      setBulkDeleteConfirmDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete recipients",
        variant: "destructive",
      });
    },
  });

  // Nuke Test Data mutation
  const nukeTestDataMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/ehub/test-data/nuke', { emailPattern: nukeEmailPattern || undefined }),
    onSuccess: (data: any) => {
      toast({
        title: "Test Data Deleted",
        description: `Deleted ${data.recipientsDeleted} recipients, ${data.messagesDeleted} messages, ${data.slotsDeleted || 0} slots, and ${data.testEmailsDeleted} test emails.`,
      });
      setNukeDialogOpen(false);
      setNukeCounts(null);
      setNukeEmailPattern("");
      setNukeConfirmText("");
      queryClient.invalidateQueries({ queryKey: ['/api/test-email/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sequences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/all-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/paused-recipients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/scheduled-sends'] });
      setNukeDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Unable to delete test data",
        variant: "destructive",
      });
    },
  });

  // Add contacts to sequence mutation
  const addContactsMutation = useMutation({
    mutationFn: ({ sequenceId, contacts, selectAll, search, statusFilter }: {
      sequenceId: string;
      contacts?: EhubContact[];
      selectAll?: boolean;
      search?: string;
      statusFilter?: string;
    }) => apiRequest('POST', `/api/sequences/${sequenceId}/contacts`, {
      contacts,
      selectAll,
      search,
      statusFilter,
    }),
    onSuccess: (data: any) => {
      toast({
        title: "Contacts Added",
        description: `${data.count} contacts added to sequence successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sequences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ehub/all-contacts'] });
      setSelectedContacts([]);
      setSelectAllMode('none');
      setIsAddToSequenceDialogOpen(false);
      setTargetSequenceId('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add contacts to sequence",
        variant: "destructive",
      });
    },
  });

  const resetSequenceForm = () => {
    setName("");
    setSenderEmailAccountId(null);
  };

  // Selection handlers
  const handleToggleContact = (contact: EhubContact) => {
    setSelectAllMode('none');
    setSelectedContacts(prev => {
      const isSelected = prev.some(c => c.email === contact.email);
      if (isSelected) {
        return prev.filter(c => c.email !== contact.email);
      } else {
        return [...prev, contact];
      }
    });
  };

  const handleSelectAllOnPage = () => {
    if (selectAllMode === 'page') {
      setSelectedContacts([]);
      setSelectAllMode('none');
    } else {
      setSelectedContacts(allContactsData?.contacts || []);
      setSelectAllMode('page');
    }
  };

  const handleSelectAllMatching = () => {
    setSelectAllMode('all');
    setSelectedContacts([]);
  };

  const handleClearSelection = () => {
    setSelectedContacts([]);
    setSelectAllMode('none');
  };

  const handleAddToSequence = () => {
    if (!targetSequenceId) return;
    
    if (selectAllMode === 'all') {
      addContactsMutation.mutate({
        sequenceId: targetSequenceId,
        selectAll: true,
        search: debouncedSearch,
        statusFilter: contactStatusFilter,
      });
    } else {
      addContactsMutation.mutate({
        sequenceId: targetSequenceId,
        contacts: selectedContacts,
      });
    }
  };

  const handleCreateSequence = () => {
    createMutation.mutate({
      name,
      senderEmailAccountId,
    });
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settingsForm);
  };

  const handleDiscardSettings = () => {
    if (originalSettings) {
      setSettingsForm(originalSettings);
      toast({
        title: "Changes Discarded",
        description: "Settings have been reset to the last saved values.",
      });
    }
  };

  const handleTabChange = (newTab: string) => {
    // If leaving settings tab with unsaved changes, show warning
    if (activeTab === 'settings' && isSettingsDirty) {
      setPendingTab(newTab);
      setShowNavigationWarning(true);
    } else {
      setActiveTab(newTab);
    }
  };

  const handleConfirmNavigation = () => {
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
    setShowNavigationWarning(false);
  };

  const handleCancelNavigation = () => {
    setPendingTab(null);
    setShowNavigationWarning(false);
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
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">E-Hub</h1>
            <p className="text-muted-foreground">Email sequence automation system</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 ml-4 px-3 py-1 rounded-full bg-muted/50 border">
                {gmailConnected ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-muted-foreground font-medium">Gmail Connected</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-muted-foreground font-medium">Gmail Not Connected</span>
                  </>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {gmailConnected ? (
                'Gmail is connected. Emails will be sent automatically.'
              ) : (
                'Gmail is not connected. Visit Settings to connect your Gmail account to enable email sending.'
              )}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <EhubMainTabs
        activeTab={activeTab}
        allContactsData={allContactsData}
        bulkDeleteConfirmDialogOpen={bulkDeleteConfirmDialogOpen}
        bulkDeleteRecipientsMutation={bulkDeleteRecipientsMutation}
        checkReplyMutation={checkReplyMutation}
        contactStatusFilter={contactStatusFilter}
        contactedFilter={contactedFilter}
        createMutation={createMutation}
        currentSequence={currentSequence}
        deleteEmailAccountMutation={deleteEmailAccountMutation}
        emailAccounts={emailAccounts}
        finalizedStrategyEdit={finalizedStrategyEdit}
        generateFinalizedStrategyMutation={generateFinalizedStrategyMutation}
        getStatusColor={getStatusColor}
        handleClearSelection={handleClearSelection}
        handleConnectEmail={handleConnectEmail}
        handleCreateSequence={handleCreateSequence}
        handleDiscardSettings={handleDiscardSettings}
        handleSaveSettings={handleSaveSettings}
        handleSelectAllMatching={handleSelectAllMatching}
        handleSelectAllOnPage={handleSelectAllOnPage}
        handleTabChange={handleTabChange}
        handleToggleContact={handleToggleContact}
        isCreateDialogOpen={isCreateDialogOpen}
        isLoadingContacts={isLoadingContacts}
        isLoadingEmailAccounts={isLoadingEmailAccounts}
        isLoadingRecipients={isLoadingRecipients}
        isLoadingTestEmails={isLoadingTestEmails}
        isSettingsDirty={isSettingsDirty}
        name={name}
        onEditStep={(step: { id: string; subjectTemplate: string | null; bodyTemplate: string | null; aiGuidance: string | null }) => {
          setEditingStepId(step.id);
          setEditStepSubject(step.subjectTemplate || "");
          setEditStepBody(step.bodyTemplate || "");
          setEditStepGuidance(step.aiGuidance || "");
          setEditStepDialogOpen(true);
        }}
        onFollowUpFromTestEmail={(test: Pick<TestEmailSend, "id" | "subject">) => {
          setSelectedTestEmailId(test.id);
          setFollowUpSubject(`Re: ${test.subject}`);
          setFollowUpBody("");
          setFollowUpDialogOpen(true);
        }}
        onInvalidActivate={(description: string) => {
          toast({
            title: "Cannot Activate",
            description,
            variant: "destructive",
          });
        }}
        onOpenNukeTestData={() => {
          setNukeDialogOpen(true);
          setNukeCounts(null);
          setNukeEmailPattern("");
          setNukeConfirmText("");
          setCountsError(null);
        }}
        onSenderEmailAccountChange={(newSenderEmailAccountId: string | null) => {
          if (selectedSequenceId) {
            updateSequenceSenderMutation.mutate({
              sequenceId: selectedSequenceId,
              senderEmailAccountId: newSenderEmailAccountId,
            });
          }
        }}
        page={page}
        recipientSelectAll={recipientSelectAll}
        recipients={recipients}
        recipientsError={recipientsError as Error | null}
        repeatLastStep={repeatLastStep}
        saveFinalizedStrategyMutation={saveFinalizedStrategyMutation}
        saveKeywordsMutation={saveKeywordsMutation}
        saveStepDelaysMutation={saveStepDelaysMutation}
        scanRepliesMutation={scanRepliesMutation}
        scrollRef={scrollRef}
        search={search}
        selectedContacts={selectedContacts}
        selectedRecipientIds={selectedRecipientIds}
        selectedSequenceId={selectedSequenceId}
        senderEmailAccountId={senderEmailAccountId}
        sendStrategyChatMutation={sendStrategyChatMutation}
        sendTestEmailMutation={sendTestEmailMutation}
        sequenceKeywords={sequenceKeywords}
        sequenceSteps={sequenceSteps}
        sequences={sequences}
        setActiveTab={setActiveTab}
        setBulkDeleteConfirmDialogOpen={setBulkDeleteConfirmDialogOpen}
        setContactStatusFilter={setContactStatusFilter}
        setContactedFilter={setContactedFilter}
        setFinalizedStrategyEdit={setFinalizedStrategyEdit}
        setIsAddToSequenceDialogOpen={setIsAddToSequenceDialogOpen}
        setIsCreateDialogOpen={setIsCreateDialogOpen}
        setIsImportDialogOpen={setIsImportDialogOpen}
        setIsTestDialogOpen={setIsTestDialogOpen}
        setName={setName}
        setPage={setPage}
        setRecipientSelectAll={setRecipientSelectAll}
        setReplyScannerDialogOpen={setReplyScannerDialogOpen}
        setSearch={setSearch}
        setSelectedRecipientIds={setSelectedRecipientIds}
        setSelectedSequenceId={setSelectedSequenceId}
        setSenderEmailAccountId={setSenderEmailAccountId}
        setSettingsForm={setSettingsForm}
        setStepDelays={setStepDelays}
        setStrategyMessage={setStrategyMessage}
        setTestBody={setTestBody}
        setTestRecipientEmail={setTestRecipientEmail}
        setTestSubject={setTestSubject}
        setDeleteSequenceId={setDeleteSequenceId}
        setRepeatLastStep={setRepeatLastStep}
        setSequenceKeywords={setSequenceKeywords}
        settingsForm={settingsForm}
        stepDelays={stepDelays}
        strategyMessage={strategyMessage}
        strategyTranscript={strategyTranscript}
        syntheticPreview={syntheticPreview}
        syntheticStoreContext={syntheticStoreContext}
        syntheticTestMutation={syntheticTestMutation}
        testBody={testBody}
        testEmailHistory={testEmailHistory}
        testRecipientEmail={testRecipientEmail}
        testSubject={testSubject}
        toast={toast}
        upcomingBlockedDays={upcomingBlockedDays}
        updateBlacklistPreferenceMutation={updateBlacklistPreferenceMutation}
        updateSequenceStatusMutation={updateSequenceStatusMutation}
        updateSettingsMutation={updateSettingsMutation}
        user={user}
        userPreferences={userPreferences}
      />

      <EhubDialogsSection
        addContactsMutation={addContactsMutation}
        allContactsData={allContactsData}
        countsError={countsError}
        deleteMutation={deleteMutation}
        deleteSequenceId={deleteSequenceId}
        editStepBody={editStepBody}
        editStepDialogOpen={editStepDialogOpen}
        editStepGuidance={editStepGuidance}
        editStepSubject={editStepSubject}
        editingStepId={editingStepId}
        followUpBody={followUpBody}
        followUpDialogOpen={followUpDialogOpen}
        followUpSubject={followUpSubject}
        handleAddToSequence={handleAddToSequence}
        handleCancelNavigation={handleCancelNavigation}
        handleConfirmNavigation={handleConfirmNavigation}
        handleImport={handleImport}
        handleSaveSettings={handleSaveSettings}
        importMutation={importMutation}
        isAddToSequenceDialogOpen={isAddToSequenceDialogOpen}
        isImportDialogOpen={isImportDialogOpen}
        isTestDialogOpen={isTestDialogOpen}
        nukeCounts={nukeCounts}
        nukeDialogOpen={nukeDialogOpen}
        nukeEmailPattern={nukeEmailPattern}
        nukeTestDataMutation={nukeTestDataMutation}
        pendingTab={pendingTab}
        replyScannnerDialogOpen={replyScannnerDialogOpen}
        scanPreviewResults={scanPreviewResults}
        scanRepliesMutation={scanRepliesMutation}
        selectedContacts={selectedContacts}
        selectedScanEmails={selectedScanEmails}
        selectedTestEmailId={selectedTestEmailId}
        selectAllMode={selectAllMode}
        sendFollowUpMutation={sendFollowUpMutation}
        sequences={sequences}
        setActiveTab={setActiveTab}
        setDeleteSequenceId={setDeleteSequenceId}
        setEditStepBody={setEditStepBody}
        setEditStepDialogOpen={setEditStepDialogOpen}
        setEditStepGuidance={setEditStepGuidance}
        setEditStepSubject={setEditStepSubject}
        setFollowUpBody={setFollowUpBody}
        setFollowUpDialogOpen={setFollowUpDialogOpen}
        setFollowUpSubject={setFollowUpSubject}
        setIsAddToSequenceDialogOpen={setIsAddToSequenceDialogOpen}
        setIsImportDialogOpen={setIsImportDialogOpen}
        setIsTestDialogOpen={setIsTestDialogOpen}
        setNukeDialogOpen={setNukeDialogOpen}
        setNukeEmailPattern={setNukeEmailPattern}
        setPendingTab={setPendingTab}
        setReplyScannerDialogOpen={setReplyScannerDialogOpen}
        setScanPreviewResults={setScanPreviewResults}
        setSelectedScanEmails={setSelectedScanEmails}
        setSelectedTestEmailId={setSelectedTestEmailId}
        setSheetId={setSheetId}
        setShowNavigationWarning={setShowNavigationWarning}
        setTargetSequenceId={setTargetSequenceId}
        setTestEmail={setTestEmail}
        sheetId={sheetId}
        showNavigationWarning={showNavigationWarning}
        targetSequenceId={targetSequenceId}
        testEmail={testEmail}
        testSendMutation={testSendMutation}
        updateSettingsMutation={updateSettingsMutation}
        updateStepTemplateMutation={updateStepTemplateMutation}
      />

    </div>
  );
}
