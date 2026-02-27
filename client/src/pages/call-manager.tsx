import { useState, useEffect, useMemo } from "react";
import { SystemHealthBanner } from "@/components/SystemHealthBanner";
import { useAuth } from "@/hooks/useAuth";
import { canAccessAdminFeatures } from "@/lib/authUtils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KBEditor } from "@/components/kb-editor";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PhoneCall, Clock, AlertCircle, CheckCircle2, Loader2, MapPin, Calendar, TrendingUp, TrendingDown, Download, Brain, Lightbulb, MessageSquare, BarChart3, FileText, RefreshCw, Trash2, Bomb, Upload, Settings2, FileEdit, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StoreDetailsDialog } from "@/components/store-details-dialog";
import { useCustomTheme } from "@/hooks/use-custom-theme";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ProposalDiffViewer } from "@/components/proposal-diff-viewer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useOptionalProject } from "@/contexts/project-context";
import { VoiceHubQueueStats } from "@/components/call-manager/voice-hub-queue-stats";
import { VoiceHubStoresTable } from "@/components/call-manager/voice-hub-stores-table";
import { AiInsightsTabContent } from "@/components/call-manager/ai-insights-tab-content";
import { AiAnalyticsTabContent } from "@/components/call-manager/ai-analytics-tab-content";
import { CallHistoryTabContent } from "@/components/call-manager/call-history-tab-content";
import { CallManagerAdminTabs } from "@/components/call-manager/call-manager-admin-tabs";
import { CallManagerDialogs } from "@/components/call-manager/call-manager-dialogs";
import { VoiceHubBatchControlsCard } from "@/components/call-manager/voice-hub-batch-controls-card";
import { VoiceHubScenariosCard } from "@/components/call-manager/voice-hub-scenarios-card";

interface ElevenLabsAgent {
  id: string;
  agent_id: string;
  name: string;
  phone_number_id: string;
}

interface HoursScheduleEntry {
  day: string;
  hours: string;
  isToday: boolean;
  isClosed: boolean;
}

interface EligibleStore {
  link: string;
  businessName: string;
  state: string;
  phone: string;
  hours: string;
  hoursSchedule?: HoursScheduleEntry[];
  isOpen: boolean;
  agentName?: string;
  status?: string;
  lastContactDate?: string;
  followUpDate?: string;
  pocName?: string;
  source: 'sheets' | 'leads';  // Unified contact source
  leadId?: string;  // For leads only - database ID
  website?: string;  // For leads only
  country?: string;  // For leads only (international)
}

interface CallQueueStats {
  activeCalls: number;
  queuedCalls: number;
  completedToday: number;
  failedToday: number;
  campaigns: any[];
}

interface CallSession {
  id: string;
  conversationId: string;
  agentId: string;
  clientId: string;
  phoneNumber: string;
  status: string;
  callDurationSecs: number;
  startedAt: string;
  endedAt: string;
  aiAnalysis: {
    summary?: string;
    sentiment?: string;
    customerMood?: string;
    mainObjection?: string;
    keyMoment?: string;
    agentStrengths?: string;
    lessonLearned?: string;
  } | null;
  callSuccessful: boolean;
  interestLevel: 'hot' | 'warm' | 'cold' | 'not-interested' | null;
}

interface CallClient {
  id: string;
  uniqueIdentifier: string;
  data: any;
}

interface CallRecord {
  session: CallSession;
  client: CallClient;
  transcriptCount: number;
}

interface CallAnalyticsMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgDurationSecs: number;
  interestLevels: {
    hot: number;
    warm: number;
    cold: number;
    notInterested: number;
  };
}

interface CallAnalyticsData {
  calls: CallRecord[];
  metrics: CallAnalyticsMetrics;
}

type CallScenario = 'cold_calls' | 'follow_ups' | 'recovery';

// KB Library Tab Component
export default function CallManager() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const projectContext = useOptionalProject();
  const currentProject = projectContext?.currentProject;
  
  const [activeScenario, setActiveScenario] = useState<CallScenario>('cold_calls');
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [schedulingMode, setSchedulingMode] = useState<'immediate' | 'scheduled' | 'auto'>('immediate');
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [ivrBehavior, setIvrBehavior] = useState<'flag_and_end' | 'flag_and_continue'>('flag_and_end');
  const [selectedAgentFilters, setSelectedAgentFilters] = useState<Set<string>>(new Set());
  const [selectedStateFilters, setSelectedStateFilters] = useState<string[]>([]);
  const [showCanadaOnly, setShowCanadaOnly] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'sheets' | 'leads'>('all');
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [selectedCallForDialog, setSelectedCallForDialog] = useState<{ conversationId: string; callData: any } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [callToDelete, setCallToDelete] = useState<string | null>(null);
  const [isNukeDialogOpen, setIsNukeDialogOpen] = useState(false);
  const [isNukeCallDataDialogOpen, setIsNukeCallDataDialogOpen] = useState(false);
  
  // AI Insights state
  const [insightsDateRange, setInsightsDateRange] = useState<'7days' | '30days' | 'custom'>('30days');
  const [insightsStartDate, setInsightsStartDate] = useState<string>('');
  const [insightsEndDate, setInsightsEndDate] = useState<string>('');
  const [insightsAgentFilter, setInsightsAgentFilter] = useState<string>('all');
  const [persistedInsights, setPersistedInsights] = useState<any>(null);
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);
  const [insightsViewMode, setInsightsViewMode] = useState<'individual' | 'all-time'>('individual');
  
  // Separate workflow tracking for Wick Coach and Aligner
  const [wickCoachStatus, setWickCoachStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [wickCoachCallCount, setWickCoachCallCount] = useState<number>(0);
  const [wickCoachError, setWickCoachError] = useState<string | null>(null);
  
  const [alignerStatus, setAlignerStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [alignerCallCount, setAlignerCallCount] = useState<number>(0);
  const [alignerKbFileCount, setAlignerKbFileCount] = useState<number>(0);
  const [alignerError, setAlignerError] = useState<string | null>(null);
  
  // Analytics filters
  const [analyticsAgentFilter, setAnalyticsAgentFilter] = useState<string>("all");
  const [analyticsDateFilter, setAnalyticsDateFilter] = useState<string>("all");
  const [analyticsStatusFilter, setAnalyticsStatusFilter] = useState<string>("all");
  const [analyticsInterestFilter, setAnalyticsInterestFilter] = useState<string>("all");
  const [syncingCalls, setSyncingCalls] = useState(false);

  // Call History filters and pagination
  const [historyPage, setHistoryPage] = useState(1);
  const [historyStartDate, setHistoryStartDate] = useState<string>("");
  const [historyEndDate, setHistoryEndDate] = useState<string>("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("all");
  const [historyCampaignFilter, setHistoryCampaignFilter] = useState<string>("all");
  const [historyAgentFilter, setHistoryAgentFilter] = useState<string>("all");
  const [historySearchQuery, setHistorySearchQuery] = useState<string>("");
  
  // Store details dialog state (matching client-dashboard pattern)
  const [storeDetailsDialog, setStoreDetailsDialog] = useState<{
    open: boolean;
    row: any;
  } | null>(null);
  
  // Loading state for store details fetch
  const [storeDetailsLoading, setStoreDetailsLoading] = useState<string | null>(null);

  // Clear selections when scenario changes
  useEffect(() => {
    setSelectedStores(new Set());
    setSelectedAgentFilters(new Set());
    setSelectedStateFilters([]);
  }, [activeScenario]);

  // Redirect if user doesn't have voice access
  useEffect(() => {
    if (user && !canAccessAdminFeatures(user) && !user.hasVoiceAccess) {
      setLocation('/');
    }
  }, [user, setLocation]);

  // Check if user should have access
  const hasAccess = canAccessAdminFeatures(user) || user?.hasVoiceAccess;

  // Fetch available agents
  const { data: agents = [], isLoading: agentsLoading } = useQuery<ElevenLabsAgent[]>({
    queryKey: ['/api/elevenlabs/agents', currentProject?.id],
    queryFn: async () => {
      const url = new URL('/api/elevenlabs/agents', window.location.origin);
      if (currentProject?.id) {
        url.searchParams.set('projectId', currentProject.id);
      }
      const response = await fetch(url.toString(), { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch agents');
      return response.json();
    },
    enabled: hasAccess,
  });

  // Fetch eligible stores for current scenario
  const { data: eligibleStores = [], isLoading: storesLoading, refetch: refetchStores } = useQuery<EligibleStore[]>({
    queryKey: ['/api/elevenlabs/eligible-stores', activeScenario, currentProject?.id],
    queryFn: async () => {
      const url = new URL(`/api/elevenlabs/eligible-stores/${activeScenario}`, window.location.origin);
      if (currentProject?.id) {
        url.searchParams.set('projectId', currentProject.id);
      }
      const response = await fetch(url.toString(), { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch eligible stores');
      return response.json();
    },
    enabled: hasAccess,
  });

  // Fetch call queue status
  const { data: callQueueStats } = useQuery<CallQueueStats>({
    queryKey: ['/api/elevenlabs/call-queue'],
    enabled: hasAccess,
    refetchInterval: 30000, // Poll every 30 seconds (reduced from 5s)
  });

  // Fetch call analytics
  const { data: analyticsData, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery<CallAnalyticsData>({
    queryKey: ['/api/elevenlabs/call-analytics', currentProject?.id],
    queryFn: async () => {
      const url = new URL('/api/elevenlabs/call-analytics', window.location.origin);
      if (currentProject?.id) {
        url.searchParams.set('projectId', currentProject.id);
      }
      const response = await fetch(url.toString(), { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch call analytics');
      return response.json();
    },
    enabled: hasAccess,
  });

  // Fetch Google Sheets data for store details dialog
  const { data: sheetsData } = useQuery<{ sheets: { id: string; sheetPurpose: string }[] }>({
    queryKey: ['/api/sheets'],
    enabled: hasAccess,
  });

  const sheets = sheetsData?.sheets || [];
  const storeSheetId = sheets.find(s => s.sheetPurpose === 'Store Database')?.id;
  const trackerSheetId = sheets.find(s => s.sheetPurpose === 'commissions')?.id;

  // Fetch user preferences for auto-trigger settings
  const { data: preferences } = useQuery<{ autoKbAnalysis?: boolean; kbAnalysisThreshold?: number }>({
    queryKey: ['/api/user/preferences'],
    enabled: canAccessAdminFeatures(user),
  });

  // Poll for analysis job status (for progress indicator)
  // Only poll frequently when a job is actually running to reduce server load
  const { data: jobStatus } = useQuery<{ status: 'idle' | 'running'; job: any }>({
    queryKey: ['/api/analysis/job-status'],
    enabled: hasAccess,
    refetchInterval: (query) => {
      // Poll every 5 seconds when job is running, otherwise only check every 60 seconds
      return query.state.data?.status === 'running' ? 5000 : 60000;
    },
  });

  const runningJob = jobStatus?.status === 'running' ? jobStatus.job : null;

  // Voice proxy health status (for indicator)
  const { data: voiceProxyStatus } = useQuery<{ healthy: boolean; audioLoaded: boolean; volumeDb: number | null; sessions: number; error?: string }>({
    queryKey: ['/api/voice-proxy/status'],
    enabled: hasAccess,
    refetchInterval: 30000, // Check every 30 seconds
    staleTime: 15000,
  });

  // Mutation to update preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: { autoKbAnalysis?: boolean; kbAnalysisThreshold?: number }) => {
      return await apiRequest('PUT', '/api/user/preferences', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
      toast({
        title: 'Settings Updated',
        description: 'Auto-trigger preferences saved successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
    },
  });

  // Get status options and colors from custom theme hook
  const { statusOptions, statusColors, currentColors } = useCustomTheme();
  const [contextUpdateTrigger, setContextUpdateTrigger] = useState(0);

  // Filter analytics data based on selected filters
  const filteredAnalyticsData = useMemo(() => {
    if (!analyticsData) return null;

    // Filter calls based on selected criteria
    const filteredCalls = analyticsData.calls.filter((call) => {
      // Agent filter
      if (analyticsAgentFilter !== 'all' && call.session.agentId !== analyticsAgentFilter) {
        return false;
      }

      // Date range filter
      if (analyticsDateFilter !== 'all' && call.session.startedAt) {
        const callDate = new Date(call.session.startedAt);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - callDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (analyticsDateFilter === 'today' && daysDiff > 0) return false;
        if (analyticsDateFilter === '7days' && daysDiff > 7) return false;
        if (analyticsDateFilter === '30days' && daysDiff > 30) return false;
      }

      // Status filter
      if (analyticsStatusFilter !== 'all') {
        if (analyticsStatusFilter === 'successful' && !call.session.callSuccessful) return false;
        if (analyticsStatusFilter === 'failed' && call.session.callSuccessful) return false;
      }

      // Interest level filter
      if (analyticsInterestFilter !== 'all' && call.session.interestLevel !== analyticsInterestFilter) {
        return false;
      }

      return true;
    });

    // Recalculate metrics based on filtered calls
    const successfulCalls = filteredCalls.filter(c => c.session.callSuccessful).length;
    const failedCalls = filteredCalls.filter(c => !c.session.callSuccessful).length;
    const totalDuration = filteredCalls.reduce((sum, c) => sum + (c.session.callDurationSecs || 0), 0);
    const avgDuration = filteredCalls.length > 0 ? totalDuration / filteredCalls.length : 0;

    const interestLevels = {
      hot: filteredCalls.filter(c => c.session.interestLevel === 'hot').length,
      warm: filteredCalls.filter(c => c.session.interestLevel === 'warm').length,
      cold: filteredCalls.filter(c => c.session.interestLevel === 'cold').length,
      notInterested: filteredCalls.filter(c => c.session.interestLevel === 'not-interested').length,
    };

    return {
      calls: filteredCalls,
      metrics: {
        totalCalls: filteredCalls.length,
        successfulCalls,
        failedCalls,
        avgDurationSecs: avgDuration,
        interestLevels,
      },
    };
  }, [analyticsData, analyticsAgentFilter, analyticsDateFilter, analyticsStatusFilter, analyticsInterestFilter]);

  // Batch call mutation
  const batchCallMutation = useMutation({
    mutationFn: async (data: { agent_record_id: string; agent_id: string; phone_number_id: string; stores: string[]; store_data?: any[]; scenario?: string; scheduled_for?: string; auto_schedule?: boolean }) => {
      console.log('[CallManager][DEBUG] ========== BATCH CALL INITIATED ==========');
      console.log('[CallManager][DEBUG] Timestamp:', new Date().toISOString());
      console.log('[CallManager][DEBUG] Agent ID:', data.agent_id);
      console.log('[CallManager][DEBUG] Store count:', data.stores.length);
      console.log('[CallManager][DEBUG] Scenario:', data.scenario);
      console.log('[CallManager][DEBUG] Scheduled for:', data.scheduled_for || 'immediate');
      console.log('[CallManager][DEBUG] Auto schedule:', data.auto_schedule);
      
      const startTime = Date.now();
      try {
        const result = await apiRequest('POST', '/api/elevenlabs/batch-call', data);
        console.log(`[CallManager][DEBUG] API response in ${Date.now() - startTime}ms`);
        console.log('[CallManager][DEBUG] Response:', result);
        return result;
      } catch (error: any) {
        console.error('[CallManager][DEBUG] *** API ERROR ***');
        console.error('[CallManager][DEBUG] Error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('[CallManager][DEBUG] ========== BATCH CALL SUCCESS ==========');
      console.log('[CallManager][DEBUG] Response data:', data);
      toast({
        title: "Calls Queued",
        description: `${selectedStores.size} calls have been queued successfully.`,
      });
      setSelectedStores(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/elevenlabs/call-queue'] });
      refetchStores();
    },
    onError: (error: any) => {
      console.error('[CallManager][DEBUG] ========== BATCH CALL ERROR ==========');
      console.error('[CallManager][DEBUG] Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to queue calls",
        variant: "destructive",
      });
    },
  });

  // Delete call mutation
  const deleteCallMutation = useMutation({
    mutationFn: async (callId: string) => {
      return apiRequest('DELETE', `/api/elevenlabs/calls/${callId}`);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Call Deleted",
        description: data.message || "Call has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/elevenlabs/call-analytics'] });
      setIsDeleteDialogOpen(false);
      setCallToDelete(null);
    },
    onError: (error: any) => {
      const errorMessage = error.details 
        ? `${error.message}\n\nDetails: ${error.details}`
        : error.message || "Failed to delete call";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  if (!hasAccess) {
    return null;
  }

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedStores.size === filteredStores.length) {
      setSelectedStores(new Set());
    } else {
      setSelectedStores(new Set(filteredStores.map(s => s.link)));
    }
  };

  // Handle individual checkbox
  const handleToggleStore = (storeLink: string) => {
    const newSelected = new Set(selectedStores);
    if (newSelected.has(storeLink)) {
      newSelected.delete(storeLink);
    } else {
      newSelected.add(storeLink);
    }
    setSelectedStores(newSelected);
  };

  // Handle batch call submission
  const handleBatchCall = () => {
    if (!selectedAgent || selectedStores.size === 0) {
      toast({
        title: "Missing Information",
        description: "Please select an agent and at least one store.",
        variant: "destructive",
      });
      return;
    }

    if (schedulingMode === 'scheduled' && !scheduledTime) {
      toast({
        title: "Missing Schedule",
        description: "Please select a date and time for scheduled calls.",
        variant: "destructive",
      });
      return;
    }

    // Runtime validation: ensure scheduled time is in the future
    if (schedulingMode === 'scheduled' && scheduledTime) {
      const scheduledDate = new Date(scheduledTime);
      if (scheduledDate <= new Date()) {
        toast({
          title: "Invalid Schedule",
          description: "Scheduled time must be in the future.",
          variant: "destructive",
        });
        return;
      }
    }

    const agent = agents.find(a => a.id === selectedAgent);
    if (!agent) return;

    // Build payload with store links
    const selectedStoreData = eligibleStores.filter(store => selectedStores.has(store.link));

    const payload: { agent_record_id: string; agent_id: string; phone_number_id: string; stores: string[]; store_data?: any[]; scenario?: string; scheduled_for?: string; auto_schedule?: boolean; ivr_behavior?: string } = {
      agent_record_id: agent.id,
      agent_id: agent.agent_id,
      phone_number_id: agent.phone_number_id,
      stores: Array.from(selectedStores),
      scenario: activeScenario,
      ivr_behavior: ivrBehavior,
      store_data: selectedStoreData,
    };

    // Configure scheduling mode
    if (schedulingMode === 'auto') {
      payload.auto_schedule = true;
    } else if (schedulingMode === 'scheduled' && scheduledTime) {
      payload.scheduled_for = new Date(scheduledTime).toISOString();
    }

    batchCallMutation.mutate(payload);
  };

  const scenarioDescriptions: Record<CallScenario, string> = {
    cold_calls: "Claimed stores ready for outreach. Filter by agent to see specific agent's claimed stores.",
    follow_ups: "Stores marked as 'Interested' with scheduled follow-up dates approaching.",
    recovery: "Leads from other agents that have been inactive for 30+ days. Re-engagement opportunities.",
  };

  // Get unique agents from stores
  const uniqueAgents = Array.from(new Set(eligibleStores.map(s => s.agentName).filter(Boolean)));

  // Helper function to check if a state is a Canadian province
  const isCanadianProvince = (state: string) => {
    const canadianProvinces = [
      'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT',
      'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
      'Nova Scotia', 'Northwest Territories', 'Nunavut', 'Ontario', 'Prince Edward Island',
      'Quebec', 'Saskatchewan', 'Yukon'
    ];
    return canadianProvinces.includes(state);
  };

  // Get unique states and state counts
  const allStates = Array.from(new Set(eligibleStores.map(s => s.state).filter(Boolean))).sort();
  const stateCounts = eligibleStores.reduce((acc, store) => {
    if (store.state) {
      acc[store.state] = (acc[store.state] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Filter stores by selected agents and states (if any filters are active)
  let filteredStores = eligibleStores;
  
  // Apply agent filter
  if (selectedAgentFilters.size > 0) {
    filteredStores = filteredStores.filter(store => store.agentName && selectedAgentFilters.has(store.agentName));
  }
  
  // Apply state filter
  if (selectedStateFilters.length > 0) {
    filteredStores = filteredStores.filter(store => store.state && selectedStateFilters.includes(store.state));
  }

  // Apply source filter (sheets vs leads)
  if (sourceFilter !== 'all') {
    filteredStores = filteredStores.filter(store => store.source === sourceFilter);
  }

  // Count by source for filter display
  const sheetsCount = eligibleStores.filter(s => s.source === 'sheets').length;
  const leadsCount = eligibleStores.filter(s => s.source === 'leads').length;

  // Toggle agent filter
  const handleToggleAgentFilter = (agentName: string) => {
    const newFilters = new Set(selectedAgentFilters);
    if (newFilters.has(agentName)) {
      newFilters.delete(agentName);
    } else {
      newFilters.add(agentName);
    }
    setSelectedAgentFilters(newFilters);
  };

  // Toggle state filter
  const handleStateChange = (state: string, checked: boolean) => {
    if (checked) {
      setSelectedStateFilters([...selectedStateFilters, state]);
    } else {
      setSelectedStateFilters(selectedStateFilters.filter(s => s !== state));
    }
  };

  // Sync calls from ElevenLabs
  const handleSyncFromElevenLabs = async () => {
    setSyncingCalls(true);
    try {
      const data = await apiRequest('POST', '/api/elevenlabs/sync-calls', {
        projectId: currentProject?.id
      });

      if (data.success) {
        toast({
          title: "Sync Complete",
          description: `Imported ${data.imported} new calls, skipped ${data.skipped} existing calls`,
        });

        // Refresh analytics data
        queryClient.invalidateQueries({ queryKey: ['/api/elevenlabs/call-analytics'] });
      } else {
        toast({
          variant: "destructive",
          title: "Sync Failed",
          description: data.error || "Failed to sync calls from ElevenLabs",
        });
      }
    } catch (error: any) {
      console.error('Error syncing calls:', error);
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message || "An error occurred while syncing calls",
      });
    } finally {
      setSyncingCalls(false);
    }
  };

  // AI Insights mutation
  const analyzeCallsMutation = useMutation({
    mutationFn: async () => {
      let startDate, endDate;
      const now = new Date();
      
      if (insightsDateRange === '7days') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        endDate = now.toISOString();
      } else if (insightsDateRange === '30days') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        endDate = now.toISOString();
      } else {
        startDate = insightsStartDate;
        endDate = insightsEndDate;
      }

      // Reset all statuses and start Wick Coach
      setWickCoachStatus('running');
      setWickCoachCallCount(0); // Will be updated on success
      setWickCoachError(null);
      setAlignerStatus('idle');
      setAlignerError(null);

      return await apiRequest('POST', '/api/elevenlabs/analyze-calls', {
        startDate,
        endDate,
        agentId: insightsAgentFilter !== 'all' ? insightsAgentFilter : undefined,
        limit: 50,
      });
    },
    onSuccess: (data) => {
      setPersistedInsights(data);
      setSelectedInsightId(data.id || null);
      
      // Wick Coach completed successfully
      setWickCoachStatus('complete');
      setWickCoachCallCount(data.callCount || 0);
      
      // Refetch historical insights after new analysis is saved
      queryClient.invalidateQueries({ queryKey: ['/api/elevenlabs/insights-history'] });
      
      // Check Aligner workflow status
      if (data.alignerStatus) {
        // Aligner started running
        setAlignerStatus('running');
        setAlignerCallCount(data.callCount || 0);
        setAlignerKbFileCount(data.alignerStatus.kbFileCount || 0);
        
        if (data.alignerStatus.error) {
          // Aligner failed - show error
          setAlignerStatus('error');
          setAlignerError(data.alignerStatus.error);
          toast({
            variant: "destructive",
            title: "Aligner Failed",
            description: data.alignerStatus.error,
          });
          setTimeout(() => {
            setWickCoachStatus('idle');
            setAlignerStatus('idle');
            setAlignerError(null);
          }, 8000);
        } else if (data.alignerStatus.success) {
          // Aligner succeeded
          setAlignerStatus('complete');
          queryClient.invalidateQueries({ queryKey: ['/api/kb/proposals'] });
          const proposalCount = data.alignerStatus.proposalCount;
          if (proposalCount > 0) {
            toast({
              title: "Full Analysis Complete!",
              description: `Wick Coach + Aligner complete. ${proposalCount} KB proposal(s) ready for review in the KB Library tab.`,
            });
          } else {
            toast({
              title: "Analysis Complete",
              description: "Wick Coach + Aligner complete. No KB changes needed at this time.",
            });
          }
          setTimeout(() => {
            setWickCoachStatus('idle');
            setAlignerStatus('idle');
          }, 8000);
        } else {
          // Aligner skipped (not configured)
          toast({
            title: "Wick Coach Complete",
            description: "AI insights generated (Aligner not configured)",
          });
          setTimeout(() => {
            setWickCoachStatus('idle');
            setAlignerStatus('idle');
          }, 5000);
        }
      } else {
        // Old response format - just show Wick Coach complete
        toast({
          title: "Analysis Complete",
          description: "AI insights have been generated from your call data",
        });
        setTimeout(() => {
          setWickCoachStatus('idle');
          setAlignerStatus('idle');
        }, 5000);
      }
    },
    onError: (error: any) => {
      setWickCoachStatus('error');
      setWickCoachError(error.message || "Failed to analyze calls");
      setTimeout(() => {
        setWickCoachStatus('idle');
        setWickCoachError(null);
      }, 5000);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error.message || "Failed to analyze calls",
      });
    },
  });

  // Mutation to nuke all analysis data
  const nukeAnalysisMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/elevenlabs/nuke-analysis', {});
    },
    onSuccess: () => {
      setIsNukeDialogOpen(false);
      setPersistedInsights(null);
      setSelectedInsightId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/elevenlabs/insights-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/elevenlabs/call-analytics'] });
      toast({
        title: "Analysis Data Cleared",
        description: "All analysis data has been reset. Calls can now be re-analyzed.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Nuke Failed",
        description: error.message || "Failed to clear analysis data",
      });
    },
  });

  // Mutation to nuke all call test data (sessions, history, transcripts, events, campaign targets)
  const nukeCallDataMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/elevenlabs/nuke-call-data', {});
    },
    onSuccess: (data: any) => {
      setIsNukeCallDataDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/elevenlabs/call-queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/elevenlabs/call-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/call-history'] });
      toast({
        title: "Call Data Cleared",
        description: data?.message || "All call test data has been deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Nuke Failed",
        description: error.message || "Failed to clear call data",
      });
    },
  });

  // Query for historical insights
  const { data: insightsHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['/api/elevenlabs/insights-history', insightsAgentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (insightsAgentFilter && insightsAgentFilter !== 'all') {
        params.append('agentId', insightsAgentFilter);
      }
      params.append('limit', '10');
      
      const response = await fetch(`/api/elevenlabs/insights-history?${params}`);
      if (!response.ok) throw new Error('Failed to fetch insights history');
      const data = await response.json();
      return data.history || [];
    },
    enabled: canAccessAdminFeatures(user),
  });

  // Auto-load most recent insight when history loads
  useEffect(() => {
    if (insightsHistory && insightsHistory.length > 0 && !persistedInsights && !selectedInsightId) {
      const mostRecent = insightsHistory[0];
      setPersistedInsights(mostRecent);
      setSelectedInsightId(mostRecent.id);
    }
  }, [insightsHistory]);

  // Function to load a specific historical insight
  const loadHistoricalInsight = (insight: any) => {
    setPersistedInsights(insight);
    setSelectedInsightId(insight.id);
    setInsightsViewMode('individual');
  };

  // Function to compute all-time aggregated summary
  const computeAllTimeSummary = () => {
    if (!insightsHistory || insightsHistory.length === 0) return null;

    const totalCalls = insightsHistory.reduce((sum: number, insight: any) => sum + (insight.callCount || 0), 0);
    
    // Aggregate objections across all insights (using commonObjections)
    const objectionMap = new Map<string, { objection: string; frequency: number }>();
    insightsHistory.forEach((insight: any) => {
      insight.commonObjections?.forEach((obj: any) => {
        const existing = objectionMap.get(obj.objection) || { objection: obj.objection, frequency: 0 };
        objectionMap.set(obj.objection, {
          objection: obj.objection,
          frequency: existing.frequency + (obj.frequency || 1)
        });
      });
    });
    const commonObjections = Array.from(objectionMap.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    // Aggregate patterns across all insights (using successPatterns)
    const patternMap = new Map<string, { pattern: string; frequency: number }>();
    insightsHistory.forEach((insight: any) => {
      insight.successPatterns?.forEach((pat: any) => {
        const existing = patternMap.get(pat.pattern) || { pattern: pat.pattern, frequency: 0 };
        patternMap.set(pat.pattern, {
          pattern: pat.pattern,
          frequency: existing.frequency + (pat.frequency || 1)
        });
      });
    });
    const successPatterns = Array.from(patternMap.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    // Calculate weighted average sentiment
    let totalPositive = 0, totalNeutral = 0, totalNegative = 0;
    let totalWeight = 0;
    insightsHistory.forEach((insight: any) => {
      const weight = insight.callCount || 0;
      totalPositive += (insight.sentimentPositive || 0) * weight;
      totalNeutral += (insight.sentimentNeutral || 0) * weight;
      totalNegative += (insight.sentimentNegative || 0) * weight;
      totalWeight += weight;
    });

    const avgSentiment = totalWeight > 0 ? {
      positive: Math.round(totalPositive / totalWeight),
      neutral: Math.round(totalNeutral / totalWeight),
      negative: Math.round(totalNegative / totalWeight),
      trends: `Aggregated across ${insightsHistory.length} analyses and ${totalCalls} total calls`
    } : { positive: 0, neutral: 0, negative: 0, trends: '' };

    // Aggregate recommendations
    const recommendationMap = new Map<string, any>();
    insightsHistory.forEach((insight: any) => {
      insight.recommendations?.forEach((rec: any) => {
        if (!recommendationMap.has(rec.title)) {
          recommendationMap.set(rec.title, rec);
        }
      });
    });
    const coachingRecommendations = Array.from(recommendationMap.values()).slice(0, 10);

    return {
      callCount: totalCalls,
      analysisCount: insightsHistory.length,
      commonObjections,
      successPatterns,
      sentimentAnalysis: avgSentiment,
      coachingRecommendations,
    };
  };

  // Use stats from API
  const queueStats = {
    active: callQueueStats?.activeCalls || 0,
    queued: callQueueStats?.queuedCalls || 0,
    completed: callQueueStats?.completedToday || 0,
    failed: callQueueStats?.failedToday || 0,
  };

  const allTimeSummary = insightsViewMode === "all-time" && insightsHistory && insightsHistory.length > 0
    ? computeAllTimeSummary()
    : null;

  // Check if today is a blocked day (holiday or custom date block)
  const { data: blockedDayData } = useQuery<{ blocked: boolean; reason: string | null }>({
    queryKey: ['/api/voice/today-blocked'],
    refetchInterval: 60000, // Refresh every minute
    enabled: hasAccess,
  });

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Blocked Day Warning Banner */}
        <SystemHealthBanner />
        {blockedDayData?.blocked && (
          <Card className="border-destructive bg-destructive/10" data-testid="card-blocked-day-warning">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0" />
                <div>
                  <p className="font-semibold text-destructive" data-testid="text-blocked-day-title">
                    NO CALLS TODAY
                  </p>
                  <p className="text-sm text-destructive/80" data-testid="text-blocked-day-reason">
                    {blockedDayData.reason || 'Today is blocked for outbound calls'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-call-manager-title">
            Call Manager
          </h1>
          <p className="text-muted-foreground mt-2" data-testid="text-call-manager-description">
            Intelligently queue AI voice calls based on calling scenarios
          </p>
        </div>

        {/* Analysis Progress Banner */}
        {runningJob && (
          <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950/20" data-testid="card-analysis-progress">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100" data-testid="text-progress-status">
                        Analyzing Calls: {runningJob.currentCallIndex || 0} of {runningJob.totalCalls || 0}
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300" data-testid="text-progress-details">
                        {runningJob.type === 'aligner' ? 'KB Analysis' : 'Wick Coach Analysis'} 
                        {runningJob.agentId && runningJob.agentId !== 'all' ? ` for agent ${runningJob.agentId}` : ' for all agents'}
                        {runningJob.proposalsCreated > 0 && ` • ${runningJob.proposalsCreated} proposals created`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-blue-900 dark:text-blue-100" data-testid="text-progress-percentage">
                        {runningJob.totalCalls > 0 
                          ? Math.round(((runningJob.currentCallIndex || 0) / runningJob.totalCalls) * 100)
                          : 0}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top-level tabs: Voice Hub, AI Call Analytics, and AI Insights */}
        <Tabs defaultValue="voice-hub" className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="voice-hub" data-testid="tab-voice-hub">Voice Hub</TabsTrigger>
              <TabsTrigger value="ai-analytics" data-testid="tab-ai-analytics">AI Call Analytics</TabsTrigger>
              <TabsTrigger value="call-history" data-testid="tab-call-history">Call History</TabsTrigger>
              {canAccessAdminFeatures(user) && (
                <>
                  <TabsTrigger value="ai-insights" data-testid="tab-ai-insights">AI Insights</TabsTrigger>
                  <TabsTrigger value="aligner-chat" data-testid="tab-aligner-chat">Aligner Chat</TabsTrigger>
                  <TabsTrigger value="kb-library" data-testid="tab-kb-library">KB Library</TabsTrigger>
                  <TabsTrigger value="campaigns" data-testid="tab-campaigns">Campaigns</TabsTrigger>
                </>
              )}
            </TabsList>
            
            <div className="flex items-center gap-3">
              {/* Voice Proxy Status Indicator */}
              <div 
                className="flex items-center gap-1.5"
                title={voiceProxyStatus?.healthy 
                  ? `Voice service online${voiceProxyStatus.sessions > 0 ? ` (${voiceProxyStatus.sessions} active)` : ''}`
                  : `Voice service offline${voiceProxyStatus?.error ? `: ${voiceProxyStatus.error}` : ''}`
                }
                data-testid="indicator-voice-proxy"
              >
                <div 
                  className={`w-2.5 h-2.5 rounded-full ${
                    voiceProxyStatus?.healthy 
                      ? 'bg-green-500' 
                      : 'bg-red-500'
                  }`}
                />
              </div>
              
              {/* Nuke Call Data Button - for testing */}
              {canAccessAdminFeatures(user) && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsNukeCallDataDialogOpen(true)}
                  data-testid="button-nuke-call-data"
                >
                  <Bomb className="h-4 w-4 mr-2" />
                  Nuke Call Data
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="voice-hub" className="space-y-6">
            <VoiceHubQueueStats queueStats={queueStats} />

            <VoiceHubBatchControlsCard
              agents={agents}
              agentsLoading={agentsLoading}
              ivrBehavior={ivrBehavior}
              onBatchCall={handleBatchCall}
              onIvrBehaviorChange={setIvrBehavior}
              onScheduledTimeChange={setScheduledTime}
              onSchedulingModeChange={setSchedulingMode}
              onSelectedAgentChange={setSelectedAgent}
              schedulingMode={schedulingMode}
              scheduledTime={scheduledTime}
              selectedAgent={selectedAgent}
              selectedStoresSize={selectedStores.size}
              submitting={batchCallMutation.isPending}
            />

            <VoiceHubScenariosCard
              activeScenario={activeScenario}
              allStates={allStates}
              eligibleStores={eligibleStores}
              filteredStores={filteredStores}
              handleSelectAll={handleSelectAll}
              handleStateChange={handleStateChange}
              handleToggleAgentFilter={handleToggleAgentFilter}
              handleToggleStore={handleToggleStore}
              isCanadianProvince={isCanadianProvince}
              leadsCount={leadsCount}
              onActiveScenarioChange={setActiveScenario}
              onSelectedStateFiltersChange={setSelectedStateFilters}
              onShowCanadaOnlyChange={setShowCanadaOnly}
              onSourceFilterChange={setSourceFilter}
              scenarioDescriptions={scenarioDescriptions}
              selectedAgentFilters={selectedAgentFilters}
              selectedStateFilters={selectedStateFilters}
              selectedStores={selectedStores}
              sheetsCount={sheetsCount}
              showCanadaOnly={showCanadaOnly}
              sourceFilter={sourceFilter}
              stateCounts={stateCounts}
              storesLoading={storesLoading}
              uniqueAgents={uniqueAgents}
            />
          </TabsContent>

          <AiAnalyticsTabContent
            agents={agents}
            analyticsAgentFilter={analyticsAgentFilter}
            analyticsDateFilter={analyticsDateFilter}
            analyticsInterestFilter={analyticsInterestFilter}
            analyticsLoading={analyticsLoading}
            analyticsStatusFilter={analyticsStatusFilter}
            filteredAnalyticsData={filteredAnalyticsData}
            onAgentFilterChange={setAnalyticsAgentFilter}
            onDateFilterChange={setAnalyticsDateFilter}
            onDeleteCall={(callId) => {
              setCallToDelete(callId);
              setIsDeleteDialogOpen(true);
            }}
            onInterestFilterChange={setAnalyticsInterestFilter}
            onStatusFilterChange={setAnalyticsStatusFilter}
            onSync={handleSyncFromElevenLabs}
            onViewTranscript={(call) => {
              setSelectedCallForDialog({
                conversationId: call.session.conversationId,
                callData: call,
              });
              setIsCallDialogOpen(true);
            }}
            syncingCalls={syncingCalls}
          />

          {canAccessAdminFeatures(user) && (
            <AiInsightsTabContent
              agents={agents}
              alignerCallCount={alignerCallCount}
              alignerError={alignerError}
              alignerKbFileCount={alignerKbFileCount}
              alignerStatus={alignerStatus}
              allTimeSummary={allTimeSummary}
              analyzeCallsMutation={analyzeCallsMutation}
              canAccessAdmin={canAccessAdminFeatures(user)}
              filteredAnalyticsData={filteredAnalyticsData}
              insightsAgentFilter={insightsAgentFilter}
              insightsDateRange={insightsDateRange}
              insightsEndDate={insightsEndDate}
              insightsHistory={insightsHistory}
              insightsStartDate={insightsStartDate}
              insightsViewMode={insightsViewMode}
              loadHistoricalInsight={loadHistoricalInsight}
              onAnalyzeCalls={() => analyzeCallsMutation.mutate()}
              onAutoKbAnalysisChange={(checked) => {
                updatePreferencesMutation.mutate({ autoKbAnalysis: checked });
              }}
              onKbAnalysisThresholdChange={(value) => {
                updatePreferencesMutation.mutate({ kbAnalysisThreshold: value });
              }}
              onOpenCallDialog={(conversationId, callData) => {
                setSelectedCallForDialog({ conversationId, callData });
                setIsCallDialogOpen(true);
              }}
              onOpenNukeDialog={() => setIsNukeDialogOpen(true)}
              onResetSelectedInsight={() => setSelectedInsightId(null)}
              onSetInsightsAgentFilter={setInsightsAgentFilter}
              onSetInsightsDateRange={setInsightsDateRange}
              onSetInsightsEndDate={setInsightsEndDate}
              onSetInsightsStartDate={setInsightsStartDate}
              onSetInsightsViewMode={setInsightsViewMode}
              persistedInsights={persistedInsights}
              preferences={preferences}
              selectedInsightId={selectedInsightId}
              updatePreferencesMutation={updatePreferencesMutation}
              wickCoachCallCount={wickCoachCallCount}
              wickCoachError={wickCoachError}
              wickCoachStatus={wickCoachStatus}
            />
          )}

          <CallManagerAdminTabs canAccessAdmin={canAccessAdminFeatures(user)} />

          <CallHistoryTabContent
            agents={agents}
            analyticsData={analyticsData}
            analyticsLoading={analyticsLoading}
            historyAgentFilter={historyAgentFilter}
            historyCampaignFilter={historyCampaignFilter}
            historyEndDate={historyEndDate}
            historyPage={historyPage}
            historySearchQuery={historySearchQuery}
            historyStartDate={historyStartDate}
            historyStatusFilter={historyStatusFilter}
            onHistoryAgentFilterChange={(value) => {
              setHistoryAgentFilter(value);
              setHistoryPage(1);
            }}
            onHistoryCampaignFilterChange={(value) => {
              setHistoryCampaignFilter(value);
              setHistoryPage(1);
            }}
            onHistoryEndDateChange={(value) => {
              setHistoryEndDate(value);
              setHistoryPage(1);
            }}
            onHistorySearchQueryChange={(value) => {
              setHistorySearchQuery(value);
              setHistoryPage(1);
            }}
            onHistoryStartDateChange={(value) => {
              setHistoryStartDate(value);
              setHistoryPage(1);
            }}
            onHistoryStatusFilterChange={(value) => {
              setHistoryStatusFilter(value);
              setHistoryPage(1);
            }}
            setHistoryPage={setHistoryPage}
            setStoreDetailsDialog={setStoreDetailsDialog}
            setStoreDetailsLoading={setStoreDetailsLoading}
            storeDetailsLoading={storeDetailsLoading}
            toast={toast}
          />
        </Tabs>
      </div>

      <CallManagerDialogs
        callToDelete={callToDelete}
        contextUpdateTrigger={contextUpdateTrigger}
        currentColors={currentColors}
        deleteCallIsPending={deleteCallMutation.isPending}
        isCallDialogOpen={isCallDialogOpen}
        isDeleteDialogOpen={isDeleteDialogOpen}
        isNukeCallDataDialogOpen={isNukeCallDataDialogOpen}
        isNukeDialogOpen={isNukeDialogOpen}
        nukeAnalysisIsPending={nukeAnalysisMutation.isPending}
        nukeCallDataIsPending={nukeCallDataMutation.isPending}
        onCallDialogOpenChange={setIsCallDialogOpen}
        onCancelDeleteCall={() => {
          setIsDeleteDialogOpen(false);
          setCallToDelete(null);
        }}
        onConfirmDeleteCall={() => {
          if (callToDelete) {
            deleteCallMutation.mutate(callToDelete);
          }
        }}
        onConfirmNukeAnalysis={() => nukeAnalysisMutation.mutate()}
        onConfirmNukeCallData={() => nukeCallDataMutation.mutate()}
        onDeleteDialogOpenChange={setIsDeleteDialogOpen}
        onNukeCallDataDialogOpenChange={setIsNukeCallDataDialogOpen}
        onNukeDialogOpenChange={setIsNukeDialogOpen}
        onSetContextUpdateTrigger={setContextUpdateTrigger}
        onStoreDetailsDialogOpenChange={(open) => {
          if (!open) {
            setStoreDetailsDialog(null);
          }
        }}
        refetchAnalytics={refetchAnalytics}
        selectedCallForDialog={selectedCallForDialog}
        statusColors={statusColors}
        statusOptions={statusOptions}
        storeDetailsDialog={storeDetailsDialog}
        storeSheetId={storeSheetId}
        trackerSheetId={trackerSheetId}
      />
    </div>
  );
}
