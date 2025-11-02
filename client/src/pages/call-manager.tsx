import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PhoneCall, Clock, AlertCircle, CheckCircle2, Loader2, MapPin, Calendar, TrendingUp, TrendingDown, Download, Brain, Lightbulb, MessageSquare, BarChart3, FileText, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CallDetailDialog } from "@/components/call-detail-dialog";
import { useCustomTheme } from "@/hooks/use-custom-theme";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ProposalDiffViewer } from "@/components/proposal-diff-viewer";

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
function KBLibraryTab() {
  const { toast } = useToast();
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [isDiffDialogOpen, setIsDiffDialogOpen] = useState(false);
  const [selectedVersionsForDiff, setSelectedVersionsForDiff] = useState<string[]>([]);
  const [isVersionDiffDialogOpen, setIsVersionDiffDialogOpen] = useState(false);

  // Fetch KB files
  const { data: kbData, isLoading: kbLoading } = useQuery({
    queryKey: ['/api/kb/files'],
  });

  const kbFiles = kbData?.files || [];

  // Fetch proposals
  const { data: proposalsData, isLoading: proposalsLoading } = useQuery({
    queryKey: ['/api/kb/proposals'],
  });

  const proposals = proposalsData?.proposals || [];
  const pendingProposals = proposals.filter((p: any) => p.status === 'pending');

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/kb/sync'),
    onSuccess: (data: any) => {
      toast({
        title: "Sync Complete",
        description: `Imported ${data.imported} new files, updated ${data.updated} existing files`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/kb/files'] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync from ElevenLabs",
        variant: "destructive",
      });
    },
  });

  // Approve proposal mutation
  const approveMutation = useMutation({
    mutationFn: (proposalId: string) => apiRequest('POST', `/api/kb/proposals/${proposalId}/approve`),
    onSuccess: () => {
      toast({
        title: "Proposal Approved",
        description: "Changes have been applied to the KB file",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/kb/proposals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kb/files'] });
      setIsDiffDialogOpen(false);
      setSelectedProposal(null);
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve proposal",
        variant: "destructive",
      });
    },
  });

  // Reject proposal mutation
  const rejectMutation = useMutation({
    mutationFn: (proposalId: string) => 
      apiRequest('POST', `/api/kb/proposals/${proposalId}/reject`),
    onSuccess: () => {
      toast({
        title: "Proposal Rejected",
        description: "Proposal has been rejected",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/kb/proposals'] });
      setIsDiffDialogOpen(false);
      setSelectedProposal(null);
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject proposal",
        variant: "destructive",
      });
    },
  });

  // Rollback mutation
  const rollbackMutation = useMutation({
    mutationFn: ({ fileId, versionId }: { fileId: string; versionId: string }) =>
      apiRequest('POST', `/api/kb/files/${fileId}/rollback`, { versionId }),
    onSuccess: () => {
      toast({
        title: "Rollback Complete",
        description: "File has been rolled back to selected version",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/kb/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kb/files', selectedFileId, 'versions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Rollback Failed",
        description: error.message || "Failed to rollback file",
        variant: "destructive",
      });
    },
  });

  // Fetch versions for selected file
  const { data: versionsData } = useQuery({
    queryKey: ['/api/kb/files', selectedFileId, 'versions'],
    enabled: !!selectedFileId && isVersionDialogOpen,
  });

  const versions = versionsData?.versions || [];

  // Find file for selected proposal
  const selectedFile = selectedProposal 
    ? kbFiles.find((f: any) => f.id === selectedProposal.kbFileId)
    : null;

  // Handle version selection for comparison
  const toggleVersionSelection = (versionId: string) => {
    setSelectedVersionsForDiff(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      } else if (prev.length < 2) {
        return [...prev, versionId];
      } else {
        // Replace first selection with new one
        return [prev[1], versionId];
      }
    });
  };

  const openVersionDiff = () => {
    if (selectedVersionsForDiff.length === 2) {
      setIsVersionDiffDialogOpen(true);
    }
  };

  // Get versions for diff comparison
  const version1 = versions.find((v: any) => v.id === selectedVersionsForDiff[0]);
  const version2 = versions.find((v: any) => v.id === selectedVersionsForDiff[1]);

  return (
    <Card data-testid="card-kb-library">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Knowledge Base Library
            </CardTitle>
            <CardDescription className="mt-2">
              Manage ElevenLabs knowledge base files with version control and AI-powered improvements
            </CardDescription>
          </div>
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            data-testid="button-sync-kb"
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync from ElevenLabs
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="files" data-testid="tabs-kb-sections">
          <TabsList className="mb-4">
            <TabsTrigger value="files" data-testid="tab-files">
              Files ({kbFiles.length})
            </TabsTrigger>
            <TabsTrigger value="proposals" data-testid="tab-proposals">
              Proposals ({pendingProposals.length} pending)
            </TabsTrigger>
          </TabsList>

          {/* Files Tab */}
          <TabsContent value="files">
            {kbLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground mt-4">Loading KB files...</p>
              </div>
            ) : kbFiles.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-lg">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No knowledge base files found. Click "Sync from ElevenLabs" to import files.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Last Synced</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kbFiles.map((file: any) => (
                    <TableRow key={file.id} data-testid={`row-kb-file-${file.id}`}>
                      <TableCell className="font-medium" data-testid={`text-filename-${file.id}`}>
                        {file.filename}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-filetype-${file.id}`}>
                          {file.fileType || 'file'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" data-testid={`text-lastsynced-${file.id}`}>
                        {file.lastSyncedAt
                          ? new Date(file.lastSyncedAt).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        {file.locked ? (
                          <Badge variant="destructive" data-testid={`badge-locked-${file.id}`}>
                            Locked
                          </Badge>
                        ) : (
                          <Badge variant="secondary" data-testid={`badge-unlocked-${file.id}`}>
                            Unlocked
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedFileId(file.id);
                            setIsVersionDialogOpen(true);
                          }}
                          data-testid={`button-view-versions-${file.id}`}
                        >
                          View Versions
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* Proposals Tab */}
          <TabsContent value="proposals">
            {proposalsLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground mt-4">Loading proposals...</p>
              </div>
            ) : proposals.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-lg">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No AI-generated proposals yet. Run an AI analysis to generate improvement suggestions.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Rationale</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposals.map((proposal: any) => (
                    <TableRow key={proposal.id} data-testid={`row-proposal-${proposal.id}`}>
                      <TableCell className="font-medium" data-testid={`text-proposal-file-${proposal.id}`}>
                        {kbFiles.find((f: any) => f.id === proposal.kbFileId)?.filename || 'Unknown'}
                      </TableCell>
                      <TableCell className="max-w-md truncate" data-testid={`text-proposal-rationale-${proposal.id}`}>
                        {proposal.rationale}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            proposal.status === 'pending' ? 'default' : 
                            proposal.status === 'approved' ? 'secondary' : 
                            'destructive'
                          }
                          data-testid={`badge-proposal-status-${proposal.id}`}
                        >
                          {proposal.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" data-testid={`text-proposal-date-${proposal.id}`}>
                        {new Date(proposal.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProposal(proposal);
                            setIsDiffDialogOpen(true);
                          }}
                          data-testid={`button-view-diff-${proposal.id}`}
                        >
                          View Diff
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Version History Dialog */}
      <Dialog open={isVersionDialogOpen} onOpenChange={(open) => {
        setIsVersionDialogOpen(open);
        if (!open) {
          setSelectedVersionsForDiff([]);
        }
      }}>
        <DialogContent className="max-w-4xl" data-testid="dialog-version-history">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle data-testid="text-dialog-title">Version History</DialogTitle>
              <Button
                size="sm"
                onClick={openVersionDiff}
                disabled={selectedVersionsForDiff.length !== 2}
                data-testid="button-compare-versions"
              >
                Compare Selected ({selectedVersionsForDiff.length}/2)
              </Button>
            </div>
          </DialogHeader>
          <ScrollArea className="h-[500px]" data-testid="scroll-version-list">
            {versions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8" data-testid="text-no-versions">
                No versions found
              </p>
            ) : (
              <div className="space-y-4">
                {versions.map((version: any, idx: number) => (
                  <Card 
                    key={version.id} 
                    data-testid={`card-version-${version.id}`}
                    className={selectedVersionsForDiff.includes(version.id) ? 'border-primary' : ''}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedVersionsForDiff.includes(version.id)}
                            onChange={() => toggleVersionSelection(version.id)}
                            className="h-4 w-4"
                            data-testid={`checkbox-version-${version.id}`}
                          />
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={idx === 0 ? 'default' : 'outline'}
                              data-testid={`badge-version-number-${version.id}`}
                            >
                              v{version.versionNumber}
                            </Badge>
                            <Badge variant="secondary" data-testid={`badge-version-source-${version.id}`}>
                              {version.source}
                            </Badge>
                            {idx === 0 && (
                              <Badge variant="default" data-testid="badge-current-version">
                                Current
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground" data-testid={`text-version-date-${version.id}`}>
                            {new Date(version.createdAt).toLocaleString()}
                          </span>
                          {idx !== 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rollbackMutation.mutate({
                                fileId: selectedFileId!,
                                versionId: version.id,
                              })}
                              disabled={rollbackMutation.isPending}
                              data-testid={`button-rollback-${version.id}`}
                            >
                              {rollbackMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Rollback'
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground" data-testid={`text-version-creator-${version.id}`}>
                        Created by: {version.createdBy}
                      </p>
                      <div className="mt-2 p-3 bg-muted/50 rounded text-sm font-mono max-h-32 overflow-auto" data-testid={`text-version-content-${version.id}`}>
                        {version.content.substring(0, 200)}
                        {version.content.length > 200 && '...'}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Proposal Diff Viewer Dialog */}
      <Dialog open={isDiffDialogOpen} onOpenChange={setIsDiffDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh]" data-testid="dialog-proposal-diff">
          <DialogHeader>
            <DialogTitle data-testid="text-diff-dialog-title">Review Proposed Changes</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[80vh]">
            {selectedProposal && selectedFile && (
              <ProposalDiffViewer
                proposal={selectedProposal}
                currentContent={selectedFile.currentContent || ''}
                proposedContent={selectedProposal.proposedContent}
                filename={selectedFile.filename}
                onApprove={() => approveMutation.mutate(selectedProposal.id)}
                onReject={() => rejectMutation.mutate(selectedProposal.id)}
                isApproving={approveMutation.isPending}
                isRejecting={rejectMutation.isPending}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Version Comparison Diff Dialog */}
      <Dialog open={isVersionDiffDialogOpen} onOpenChange={setIsVersionDiffDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh]" data-testid="dialog-version-diff">
          <DialogHeader>
            <DialogTitle data-testid="text-version-diff-title">
              Compare Versions
              {version1 && version2 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  v{version1.versionNumber} vs v{version2.versionNumber}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[80vh]">
            {version1 && version2 && (
              <ProposalDiffViewer
                proposal={{
                  id: 'version-comparison',
                  kbFileId: selectedFileId || '',
                  rationale: `Comparing version ${version1.versionNumber} (${version1.source}) with version ${version2.versionNumber} (${version2.source})`,
                  status: 'comparison',
                  createdAt: new Date().toISOString(),
                }}
                currentContent={version1.content}
                proposedContent={version2.content}
                filename={kbFiles.find((f: any) => f.id === selectedFileId)?.filename || 'Unknown'}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function CallManager() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [activeScenario, setActiveScenario] = useState<CallScenario>('cold_calls');
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [schedulingMode, setSchedulingMode] = useState<'immediate' | 'scheduled' | 'auto'>('immediate');
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [selectedAgentFilters, setSelectedAgentFilters] = useState<Set<string>>(new Set());
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [selectedCallForDialog, setSelectedCallForDialog] = useState<{ conversationId: string; callData: any } | null>(null);
  
  // AI Insights state
  const [insightsDateRange, setInsightsDateRange] = useState<'7days' | '30days' | 'custom'>('30days');
  const [insightsStartDate, setInsightsStartDate] = useState<string>('');
  const [insightsEndDate, setInsightsEndDate] = useState<string>('');
  const [insightsAgentFilter, setInsightsAgentFilter] = useState<string>('all');
  const [persistedInsights, setPersistedInsights] = useState<any>(null);
  
  // Analytics filters
  const [analyticsAgentFilter, setAnalyticsAgentFilter] = useState<string>("all");
  const [analyticsDateFilter, setAnalyticsDateFilter] = useState<string>("all");
  const [analyticsStatusFilter, setAnalyticsStatusFilter] = useState<string>("all");
  const [analyticsInterestFilter, setAnalyticsInterestFilter] = useState<string>("all");
  const [syncingCalls, setSyncingCalls] = useState(false);

  // Clear selections when scenario changes
  useEffect(() => {
    setSelectedStores(new Set());
    setSelectedAgentFilters(new Set());
  }, [activeScenario]);

  // Redirect if user doesn't have voice access
  useEffect(() => {
    if (user && user.role !== 'admin' && !user.hasVoiceAccess) {
      setLocation('/');
    }
  }, [user, setLocation]);

  // Check if user should have access
  const hasAccess = user?.role === 'admin' || user?.hasVoiceAccess;

  // Fetch available agents
  const { data: agents = [], isLoading: agentsLoading } = useQuery<ElevenLabsAgent[]>({
    queryKey: ['/api/elevenlabs/agents'],
    enabled: hasAccess,
  });

  // Fetch eligible stores for current scenario
  const { data: eligibleStores = [], isLoading: storesLoading, refetch: refetchStores } = useQuery<EligibleStore[]>({
    queryKey: ['/api/elevenlabs/eligible-stores', activeScenario],
    enabled: hasAccess,
  });

  // Fetch call queue status
  const { data: callQueueStats } = useQuery<CallQueueStats>({
    queryKey: ['/api/elevenlabs/call-queue'],
    enabled: hasAccess,
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  });

  // Fetch call analytics
  const { data: analyticsData, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery<CallAnalyticsData>({
    queryKey: ['/api/elevenlabs/call-analytics'],
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
      return apiRequest('POST', '/api/elevenlabs/batch-call', data);
    },
    onSuccess: () => {
      toast({
        title: "Calls Queued",
        description: `${selectedStores.size} calls have been queued successfully.`,
      });
      setSelectedStores(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/elevenlabs/call-queue'] });
      refetchStores();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to queue calls",
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

    // Build payload with store links for auto-scheduling
    const selectedStoreData = eligibleStores.filter(store => selectedStores.has(store.link));

    const payload: { agent_record_id: string; agent_id: string; phone_number_id: string; stores: string[]; store_data?: any[]; scenario?: string; scheduled_for?: string; auto_schedule?: boolean } = {
      agent_record_id: agent.id,
      agent_id: agent.agent_id,
      phone_number_id: agent.phone_number_id,
      stores: Array.from(selectedStores),
      scenario: activeScenario,
    };

    // Include full store data for auto-scheduling
    if (schedulingMode === 'auto') {
      payload.auto_schedule = true;
      payload.store_data = selectedStoreData;
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

  // Filter stores by selected agents (if any filters are active)
  const filteredStores = selectedAgentFilters.size === 0 
    ? eligibleStores 
    : eligibleStores.filter(store => store.agentName && selectedAgentFilters.has(store.agentName));

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

  // Sync calls from ElevenLabs
  const handleSyncFromElevenLabs = async () => {
    setSyncingCalls(true);
    try {
      const data = await apiRequest('POST', '/api/elevenlabs/sync-calls');

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

      return await apiRequest('POST', '/api/elevenlabs/analyze-calls', {
        startDate,
        endDate,
        agentId: insightsAgentFilter !== 'all' ? insightsAgentFilter : undefined,
        limit: 50,
      });
    },
    onSuccess: (data) => {
      setPersistedInsights(data);
      // Refetch historical insights after new analysis is saved
      queryClient.invalidateQueries({ queryKey: ['/api/elevenlabs/insights-history'] });
      toast({
        title: "Analysis Complete",
        description: "AI insights have been generated from your call data",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error.message || "Failed to analyze calls",
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
    enabled: user?.role === 'admin',
  });

  // Use stats from API
  const queueStats = {
    active: callQueueStats?.activeCalls || 0,
    queued: callQueueStats?.queuedCalls || 0,
    completed: callQueueStats?.completedToday || 0,
    failed: callQueueStats?.failedToday || 0,
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-call-manager-title">
            Call Manager
          </h1>
          <p className="text-muted-foreground mt-2" data-testid="text-call-manager-description">
            Intelligently queue AI voice calls based on calling scenarios
          </p>
        </div>

        {/* Top-level tabs: Voice Hub, AI Call Analytics, and AI Insights */}
        <Tabs defaultValue="voice-hub" className="space-y-6">
          <TabsList>
            <TabsTrigger value="voice-hub" data-testid="tab-voice-hub">Voice Hub</TabsTrigger>
            <TabsTrigger value="ai-analytics" data-testid="tab-ai-analytics">AI Call Analytics</TabsTrigger>
            {user?.role === 'admin' && (
              <>
                <TabsTrigger value="ai-insights" data-testid="tab-ai-insights">AI Insights</TabsTrigger>
                <TabsTrigger value="kb-library" data-testid="tab-kb-library">KB Library</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="voice-hub" className="space-y-6">
            {/* Real-time Queue Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card data-testid="card-stat-active">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
              <PhoneCall className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-count">{queueStats.active}</div>
              <p className="text-xs text-muted-foreground">Currently in progress</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-queued">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Queued</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-queued-count">{queueStats.queued}</div>
              <p className="text-xs text-muted-foreground">Waiting to dial</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-completed">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-completed-count">{queueStats.completed}</div>
              <p className="text-xs text-muted-foreground">Successfully finished</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-failed">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-failed-count">{queueStats.failed}</div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Agent Selector and Batch Actions */}
        <Card data-testid="card-batch-controls">
          <CardHeader>
            <CardTitle>Batch Calling</CardTitle>
            <CardDescription>Select an AI agent and queue multiple calls at once</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Agent</label>
                  <Select value={selectedAgent} onValueChange={(value) => {
                    console.log('[CallManager] Agent selected:', value);
                    setSelectedAgent(value);
                  }} disabled={agentsLoading}>
                    <SelectTrigger data-testid="select-agent">
                      <SelectValue placeholder={agentsLoading ? "Loading agents..." : "Choose an agent"}>
                        {selectedAgent && agents.find(a => a.id === selectedAgent)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id} data-testid={`select-agent-${agent.id}`}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Scheduling</label>
                  <RadioGroup value={schedulingMode} onValueChange={(v) => setSchedulingMode(v as 'immediate' | 'scheduled' | 'auto')} data-testid="radio-scheduling-mode">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="immediate" id="immediate" data-testid="radio-immediate" />
                      <Label htmlFor="immediate">Call Immediately</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="scheduled" id="scheduled" data-testid="radio-scheduled" />
                      <Label htmlFor="scheduled">Schedule for Later</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="auto" id="auto" data-testid="radio-auto" />
                      <Label htmlFor="auto">Auto Schedule (Smart Hours)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {schedulingMode === 'scheduled' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Schedule Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    step="300"
                    min={(() => {
                      const now = new Date();
                      // Adjust for timezone offset to get local time string
                      const offset = now.getTimezoneOffset();
                      const localTime = new Date(now.getTime() - offset * 60 * 1000);
                      return localTime.toISOString().slice(0, 16);
                    })()}
                    data-testid="input-scheduled-time"
                  />
                </div>
              )}

              {schedulingMode === 'auto' && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm text-muted-foreground">
                    Calls will be automatically scheduled during each store's business hours based on their timezone and operating schedule.
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleBatchCall}
                  disabled={selectedStores.size === 0 || !selectedAgent || batchCallMutation.isPending}
                  data-testid="button-queue-calls"
                >
                  {batchCallMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Queueing...
                    </>
                  ) : schedulingMode === 'scheduled' ? (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule {selectedStores.size > 0 ? `${selectedStores.size} ` : ''}Calls
                    </>
                  ) : schedulingMode === 'auto' ? (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Auto Schedule {selectedStores.size > 0 ? `${selectedStores.size} ` : ''}Calls
                    </>
                  ) : (
                    <>
                      <PhoneCall className="h-4 w-4 mr-2" />
                      Queue {selectedStores.size > 0 ? `${selectedStores.size} ` : ''}Calls
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scenario Tabs */}
        <Card data-testid="card-scenarios">
          <Tabs value={activeScenario} onValueChange={(v) => setActiveScenario(v as CallScenario)}>
            <CardHeader>
              <TabsList className="grid w-full grid-cols-3" data-testid="tabs-scenarios">
                <TabsTrigger value="cold_calls" data-testid="tab-cold-calls">
                  Cold Calls
                </TabsTrigger>
                <TabsTrigger value="follow_ups" data-testid="tab-follow-ups">
                  Follow-Ups
                </TabsTrigger>
                <TabsTrigger value="recovery" data-testid="tab-recovery">
                  Recovery
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value={activeScenario} className="mt-0">
                <div className="space-y-4">
                  {/* Scenario Description */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground" data-testid="text-scenario-description">
                      {scenarioDescriptions[activeScenario]}
                    </p>
                  </div>

                  {/* Agent Filters - only show for cold_calls */}
                  {activeScenario === 'cold_calls' && uniqueAgents.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <h3 className="text-sm font-medium mb-3">Filter by Agent</h3>
                      <div className="flex flex-wrap gap-2">
                        {uniqueAgents.map((agent) => {
                          const count = eligibleStores.filter(s => s.agentName === agent).length;
                          return (
                            <div key={agent} className="flex items-center space-x-2">
                              <Checkbox
                                id={`agent-${agent}`}
                                checked={selectedAgentFilters.has(agent)}
                                onCheckedChange={() => handleToggleAgentFilter(agent)}
                                data-testid={`checkbox-agent-${agent}`}
                              />
                              <Label htmlFor={`agent-${agent}`} className="cursor-pointer">
                                {agent} ({count})
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Stores Table */}
                  {storesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredStores.length === 0 ? (
                    <div className="text-center py-12 bg-muted/20 rounded-lg">
                      <p className="text-muted-foreground" data-testid="text-no-stores">
                        {selectedAgentFilters.size > 0 
                          ? "No stores found for the selected agents." 
                          : "No eligible stores found for this scenario."}
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedStores.size === filteredStores.length && filteredStores.length > 0}
                                onCheckedChange={handleSelectAll}
                                data-testid="checkbox-select-all"
                              />
                            </TableHead>
                            <TableHead>Business Name</TableHead>
                            <TableHead>Agent</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Hours</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredStores.map((store) => (
                            <TableRow key={store.link} data-testid={`row-store-${store.link}`}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedStores.has(store.link)}
                                  onCheckedChange={() => handleToggleStore(store.link)}
                                  data-testid={`checkbox-store-${store.link}`}
                                />
                              </TableCell>
                              <TableCell className="font-medium" data-testid={`text-name-${store.link}`}>
                                {store.businessName}
                              </TableCell>
                              <TableCell data-testid={`text-agent-${store.link}`}>
                                <span className="text-sm">{store.agentName || "N/A"}</span>
                              </TableCell>
                              <TableCell data-testid={`text-location-${store.link}`}>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm">{store.state}</span>
                                </div>
                              </TableCell>
                              <TableCell data-testid={`text-phone-${store.link}`}>
                                {store.phone || "N/A"}
                              </TableCell>
                              <TableCell data-testid={`text-hours-${store.link}`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                    {store.hoursSchedule && store.hoursSchedule.length > 0 ? (
                                      store.hoursSchedule.map((entry, idx) => (
                                        <div key={idx} className={`flex items-center gap-2 text-sm ${entry.isToday ? 'font-medium' : 'text-muted-foreground'}`}>
                                          <span className="w-20 flex-shrink-0">{entry.day}:</span>
                                          <span className={entry.isClosed ? 'text-destructive' : ''}>{entry.hours}</span>
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-sm text-muted-foreground">
                                        {store.hours || "N/A"}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex-shrink-0">
                                    {store.isOpen ? (
                                      <Badge variant="default" className="bg-green-600" data-testid={`badge-open-${store.link}`}>
                                        Open
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive" data-testid={`badge-closed-${store.link}`}>
                                        Closed
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell data-testid={`text-status-${store.link}`}>
                                <Badge variant="outline">{store.status || "Unclaimed"}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
          </TabsContent>

          <TabsContent value="ai-analytics" className="space-y-6">
            {/* AI Call Analytics Section */}
            <Card data-testid="card-ai-analytics">
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-6">
                <div className="space-y-1.5">
                  <CardTitle>AI Call Analytics</CardTitle>
                  <CardDescription>Insights from your AI-powered calls</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncFromElevenLabs}
                  disabled={syncingCalls}
                  data-testid="button-sync-elevenlabs"
                >
                  {syncingCalls ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Sync from ElevenLabs
                    </>
                  )}
                </Button>
              </CardHeader>
          <CardContent>
            {/* Analytics Filters */}
            <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/20 rounded-lg" data-testid="analytics-filters">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="analytics-agent-filter" className="text-sm font-medium">AI Agent</Label>
                <Select value={analyticsAgentFilter} onValueChange={setAnalyticsAgentFilter}>
                  <SelectTrigger id="analytics-agent-filter" data-testid="select-analytics-agent">
                    <SelectValue placeholder="All Agents" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.agent_id} value={agent.agent_id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="analytics-date-filter" className="text-sm font-medium">Date Range</Label>
                <Select value={analyticsDateFilter} onValueChange={setAnalyticsDateFilter}>
                  <SelectTrigger id="analytics-date-filter" data-testid="select-analytics-date">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="analytics-status-filter" className="text-sm font-medium">Call Status</Label>
                <Select value={analyticsStatusFilter} onValueChange={setAnalyticsStatusFilter}>
                  <SelectTrigger id="analytics-status-filter" data-testid="select-analytics-status">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="successful">Successful</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="analytics-interest-filter" className="text-sm font-medium">Interest Level</Label>
                <Select value={analyticsInterestFilter} onValueChange={setAnalyticsInterestFilter}>
                  <SelectTrigger id="analytics-interest-filter" data-testid="select-analytics-interest">
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="hot">Hot</SelectItem>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="cold">Cold</SelectItem>
                    <SelectItem value="not_interested">Not Interested</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs defaultValue="dashboard" data-testid="tabs-analytics">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dashboard" data-testid="tab-dashboard">
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="recent-calls" data-testid="tab-recent-calls">
                  Recent Calls
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="mt-6">
                {analyticsLoading ? (
                  <div className="flex justify-center py-12" data-testid="loading-analytics">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredAnalyticsData ? (
                  <div className="space-y-6">
                    {/* Metrics Grid */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      {/* Total Calls */}
                      <Card data-testid="card-metric-total">
                        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                          <PhoneCall className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold" data-testid="text-total-calls">
                            {filteredAnalyticsData.metrics.totalCalls}
                          </div>
                          <p className="text-xs text-muted-foreground">All time</p>
                        </CardContent>
                      </Card>

                      {/* Success Rate */}
                      <Card data-testid="card-metric-success">
                        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                          {filteredAnalyticsData.metrics.totalCalls > 0 && 
                            (filteredAnalyticsData.metrics.successfulCalls / filteredAnalyticsData.metrics.totalCalls) >= 0.5 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold" data-testid="text-success-rate">
                            {filteredAnalyticsData.metrics.totalCalls > 0
                              ? Math.round((filteredAnalyticsData.metrics.successfulCalls / filteredAnalyticsData.metrics.totalCalls) * 100)
                              : 0}%
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {filteredAnalyticsData.metrics.successfulCalls} / {filteredAnalyticsData.metrics.totalCalls} successful
                          </p>
                        </CardContent>
                      </Card>

                      {/* Average Duration */}
                      <Card data-testid="card-metric-duration">
                        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold" data-testid="text-avg-duration">
                            {(() => {
                              const totalSecs = filteredAnalyticsData.metrics.avgDurationSecs;
                              const mins = Math.floor(totalSecs / 60);
                              const secs = Math.floor(totalSecs % 60);
                              return `${mins}:${secs.toString().padStart(2, '0')}`;
                            })()}
                          </div>
                          <p className="text-xs text-muted-foreground">Minutes:Seconds</p>
                        </CardContent>
                      </Card>

                      {/* Interest Breakdown */}
                      <Card data-testid="card-metric-interest">
                        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Interest Breakdown</CardTitle>
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2" data-testid="interest-breakdown">
                            <Badge variant="default" className="bg-red-600" data-testid="badge-hot">
                              Hot: {filteredAnalyticsData.metrics.interestLevels.hot}
                            </Badge>
                            <Badge variant="default" className="bg-orange-600" data-testid="badge-warm">
                              Warm: {filteredAnalyticsData.metrics.interestLevels.warm}
                            </Badge>
                            <Badge variant="default" className="bg-blue-600" data-testid="badge-cold">
                              Cold: {filteredAnalyticsData.metrics.interestLevels.cold}
                            </Badge>
                            <Badge variant="outline" data-testid="badge-not-interested">
                              Not Int: {filteredAnalyticsData.metrics.interestLevels.notInterested}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-muted/20 rounded-lg">
                    <p className="text-muted-foreground" data-testid="text-no-analytics">
                      No analytics data available
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="recent-calls" className="mt-6">
                {analyticsLoading ? (
                  <div className="flex justify-center py-12" data-testid="loading-recent-calls">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredAnalyticsData && filteredAnalyticsData.calls.length > 0 ? (
                  <ScrollArea className="h-[600px]" data-testid="scroll-recent-calls">
                    <div className="space-y-4 pr-4">
                      {filteredAnalyticsData.calls.map((call) => {
                        const getInterestBadgeVariant = (level: string | null) => {
                          if (!level) return { variant: 'outline' as const, className: '' };
                          switch (level) {
                            case 'hot':
                              return { variant: 'default' as const, className: 'bg-red-600' };
                            case 'warm':
                              return { variant: 'default' as const, className: 'bg-orange-600' };
                            case 'cold':
                              return { variant: 'default' as const, className: 'bg-blue-600' };
                            case 'not-interested':
                              return { variant: 'outline' as const, className: '' };
                            default:
                              return { variant: 'outline' as const, className: '' };
                          }
                        };

                        const interestBadge = getInterestBadgeVariant(call.session.interestLevel);
                        const storeName = call.client.data?.Name || call.client.uniqueIdentifier || 'Unknown Store';

                        return (
                          <Card key={call.session.id} data-testid={`card-call-${call.session.id}`}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-base" data-testid={`text-store-${call.session.id}`}>
                                    {storeName}
                                  </CardTitle>
                                  <CardDescription data-testid={`text-phone-${call.session.id}`}>
                                    {call.session.phoneNumber}
                                  </CardDescription>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                  {call.session.callSuccessful ? (
                                    <Badge variant="default" className="bg-green-600" data-testid={`badge-success-${call.session.id}`}>
                                      Success
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive" data-testid={`badge-failed-${call.session.id}`}>
                                      Failed
                                    </Badge>
                                  )}
                                  {call.session.interestLevel && (
                                    <Badge 
                                      variant={interestBadge.variant} 
                                      className={interestBadge.className}
                                      data-testid={`badge-interest-${call.session.id}`}
                                    >
                                      {call.session.interestLevel}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1" data-testid={`text-date-${call.session.id}`}>
                                  <Calendar className="h-3 w-3" />
                                  {new Date(call.session.startedAt).toLocaleString()}
                                </div>
                                <div className="flex items-center gap-1" data-testid={`text-duration-${call.session.id}`}>
                                  <Clock className="h-3 w-3" />
                                  {(() => {
                                    const mins = Math.floor(call.session.callDurationSecs / 60);
                                    const secs = Math.floor(call.session.callDurationSecs % 60);
                                    return `${mins}:${secs.toString().padStart(2, '0')}`;
                                  })()}
                                </div>
                              </div>
                              {call.session.aiAnalysis?.summary && (
                                <p 
                                  className="text-sm line-clamp-2" 
                                  data-testid={`text-summary-${call.session.id}`}
                                >
                                  {call.session.aiAnalysis.summary}
                                </p>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedCallForDialog({
                                    conversationId: call.session.conversationId,
                                    callData: call
                                  });
                                  setIsCallDialogOpen(true);
                                }}
                                data-testid={`button-transcript-${call.session.id}`}
                              >
                                View Transcript
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12 bg-muted/20 rounded-lg">
                    <p className="text-muted-foreground" data-testid="text-no-recent-calls">
                      No recent calls to display
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
          </TabsContent>

          {user?.role === 'admin' && (
            <TabsContent value="ai-insights" className="space-y-6">
              {/* AI Insights Section */}
              <Card data-testid="card-ai-insights">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" data-testid="text-ai-insights-title">
                  <Brain className="h-5 w-5" />
                  AI Insights
                </CardTitle>
                <CardDescription data-testid="text-ai-insights-description">
                  Analyze call patterns, objections, and success factors using AI-powered analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Filters */}
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="insights-date-range">Date Range</Label>
                    <Select 
                      value={insightsDateRange} 
                      onValueChange={(value: any) => setInsightsDateRange(value)}
                    >
                      <SelectTrigger id="insights-date-range" className="w-[180px]" data-testid="select-insights-date-range">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7days">Last 7 Days</SelectItem>
                        <SelectItem value="30days">Last 30 Days</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {insightsDateRange === 'custom' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="insights-start-date">Start Date</Label>
                        <Input
                          id="insights-start-date"
                          type="date"
                          value={insightsStartDate}
                          onChange={(e) => setInsightsStartDate(e.target.value)}
                          data-testid="input-insights-start-date"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="insights-end-date">End Date</Label>
                        <Input
                          id="insights-end-date"
                          type="date"
                          value={insightsEndDate}
                          onChange={(e) => setInsightsEndDate(e.target.value)}
                          data-testid="input-insights-end-date"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="insights-agent-filter">AI Agent</Label>
                    <Select 
                      value={insightsAgentFilter} 
                      onValueChange={setInsightsAgentFilter}
                    >
                      <SelectTrigger id="insights-agent-filter" className="w-[200px]" data-testid="select-insights-agent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Agents</SelectItem>
                        {agents?.map((agent: ElevenLabsAgent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={() => analyzeCallsMutation.mutate()}
                    disabled={analyzeCallsMutation.isPending}
                    data-testid="button-analyze-calls"
                  >
                    {analyzeCallsMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analyze Calls
                      </>
                    )}
                  </Button>
                </div>

                {/* Historical Trends Section */}
                {insightsHistory && insightsHistory.length > 0 && (
                  <Card className="mt-6" data-testid="card-historical-trends">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Historical Trends
                      </CardTitle>
                      <CardDescription>
                        Track improvements in AI agent performance over time
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* Sentiment Trend Chart */}
                        <div>
                          <h4 className="text-sm font-medium mb-4">Sentiment Trends</h4>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={insightsHistory.slice().reverse().map((insight: any) => ({
                              date: new Date(insight.analyzedAt).toLocaleDateString(),
                              positive: insight.sentimentPositive || 0,
                              neutral: insight.sentimentNeutral || 0,
                              negative: insight.sentimentNegative || 0,
                            }))}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis label={{ value: 'Percentage', angle: -90, position: 'insideLeft' }} />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="positive" stroke="#22c55e" strokeWidth={2} name="Positive" />
                              <Line type="monotone" dataKey="neutral" stroke="#eab308" strokeWidth={2} name="Neutral" />
                              <Line type="monotone" dataKey="negative" stroke="#ef4444" strokeWidth={2} name="Negative" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Recent Insights Summary */}
                        <div>
                          <h4 className="text-sm font-medium mb-3">Recent Analysis History</h4>
                          <div className="space-y-2">
                            {insightsHistory.slice(0, 5).map((insight: any, idx: number) => (
                              <div key={insight.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`historical-insight-${idx}`}>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="font-medium">{new Date(insight.analyzedAt).toLocaleDateString()}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {insight.callCount} calls
                                    </Badge>
                                  </div>
                                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                    <span className="text-green-600">+{insight.sentimentPositive}%</span>
                                    <span className="text-yellow-600">~{insight.sentimentNeutral}%</span>
                                    <span className="text-red-600">-{insight.sentimentNegative}%</span>
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {insight.objections?.length || 0} objections, {insight.patterns?.length || 0} patterns
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Insights Results */}
                {persistedInsights && (
                  <div className="space-y-6 mt-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Analysis completed for {persistedInsights.callCount} calls
                    </div>

                    {/* Common Objections */}
                    {persistedInsights.commonObjections && persistedInsights.commonObjections.length > 0 && (
                      <Card data-testid="card-common-objections">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <MessageSquare className="h-5 w-5" />
                            Common Objections
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {persistedInsights.commonObjections.map((objection: any, idx: number) => (
                              <div key={idx} className="border rounded-lg p-4" data-testid={`objection-${idx}`}>
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-medium">{objection.objection}</p>
                                  <Badge variant="secondary" data-testid={`objection-frequency-${idx}`}>
                                    {objection.frequency}x
                                  </Badge>
                                </div>
                                {objection.exampleConversations && objection.exampleConversations.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <span className="text-xs text-muted-foreground">Examples:</span>
                                    {objection.exampleConversations.slice(0, 3).map((example: any, exIdx: number) => (
                                      <Badge
                                        key={exIdx}
                                        variant="outline"
                                        className="cursor-pointer hover-elevate text-xs"
                                        onClick={() => {
                                          setSelectedCallForDialog({ 
                                            conversationId: example.conversationId, 
                                            callData: null 
                                          });
                                          setIsCallDialogOpen(true);
                                        }}
                                        data-testid={`example-badge-${idx}-${exIdx}`}
                                      >
                                        {example.duration ? `${Math.floor(example.duration / 60)}:${String(example.duration % 60).padStart(2, '0')}` : ''} {example.storeName}{example.city && example.state ? `, ${example.city}, ${example.state}` : ''}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Success Patterns */}
                    {persistedInsights.successPatterns && persistedInsights.successPatterns.length > 0 && (
                      <Card data-testid="card-success-patterns">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            Success Patterns
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {persistedInsights.successPatterns.map((pattern: any, idx: number) => (
                              <div key={idx} className="border rounded-lg p-4" data-testid={`pattern-${idx}`}>
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-medium">{pattern.pattern}</p>
                                  <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
                                    {pattern.frequency}x
                                  </Badge>
                                </div>
                                {pattern.exampleConversations && pattern.exampleConversations.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <span className="text-xs text-muted-foreground">Examples:</span>
                                    {pattern.exampleConversations.slice(0, 3).map((example: any, exIdx: number) => (
                                      <Badge
                                        key={exIdx}
                                        variant="outline"
                                        className="cursor-pointer hover-elevate text-xs"
                                        onClick={() => {
                                          setSelectedCallForDialog({ 
                                            conversationId: example.conversationId, 
                                            callData: null 
                                          });
                                          setIsCallDialogOpen(true);
                                        }}
                                        data-testid={`pattern-example-badge-${idx}-${exIdx}`}
                                      >
                                        {example.duration ? `${Math.floor(example.duration / 60)}:${String(example.duration % 60).padStart(2, '0')}` : ''} {example.storeName}{example.city && example.state ? `, ${example.city}, ${example.state}` : ''}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Sentiment Analysis */}
                    {persistedInsights.sentimentAnalysis && (
                      <Card data-testid="card-sentiment-analysis">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <BarChart3 className="h-5 w-5" />
                            Sentiment Analysis
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-500">
                                {persistedInsights.sentimentAnalysis.positive}%
                              </div>
                              <p className="text-sm text-muted-foreground">Positive</p>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-yellow-500">
                                {persistedInsights.sentimentAnalysis.neutral}%
                              </div>
                              <p className="text-sm text-muted-foreground">Neutral</p>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-red-500">
                                {persistedInsights.sentimentAnalysis.negative}%
                              </div>
                              <p className="text-sm text-muted-foreground">Negative</p>
                            </div>
                          </div>
                          {persistedInsights.sentimentAnalysis.trends && (
                            <p className="text-sm text-muted-foreground border-t pt-4">
                              {persistedInsights.sentimentAnalysis.trends}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Coaching Recommendations */}
                    {persistedInsights.coachingRecommendations && persistedInsights.coachingRecommendations.length > 0 && (
                      <Card data-testid="card-coaching-recommendations">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Lightbulb className="h-5 w-5 text-yellow-500" />
                            Coaching Recommendations
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {persistedInsights.coachingRecommendations.map((rec: any, idx: number) => (
                              <div key={idx} className="border rounded-lg p-4" data-testid={`recommendation-${idx}`}>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <p className="font-medium">{rec.title}</p>
                                  <Badge 
                                    variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}
                                    data-testid={`recommendation-priority-${idx}`}
                                  >
                                    {rec.priority}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{rec.description}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Empty State */}
                {!persistedInsights && !analyzeCallsMutation.isPending && (
                  <div className="text-center py-12 bg-muted/20 rounded-lg">
                    <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground" data-testid="text-no-insights">
                      Select filters and click "Analyze Calls" to generate AI-powered insights
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {/* KB Library Tab */}
          {user?.role === 'admin' && (
            <TabsContent value="kb-library" className="space-y-6">
              <KBLibraryTab />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Call Detail Dialog */}
      <CallDetailDialog
        open={isCallDialogOpen}
        onOpenChange={setIsCallDialogOpen}
        conversationId={selectedCallForDialog?.conversationId || null}
        callData={selectedCallForDialog?.callData || null}
        trackerSheetId={trackerSheetId}
        storeSheetId={storeSheetId}
        refetch={refetchAnalytics}
        currentColors={currentColors}
        statusOptions={statusOptions}
        statusColors={statusColors}
        contextUpdateTrigger={contextUpdateTrigger}
        setContextUpdateTrigger={setContextUpdateTrigger}
      />
    </div>
  );
}
