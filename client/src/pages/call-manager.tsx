import { useState, useEffect, useMemo } from "react";
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
import { CallDetailDialog } from "@/components/call-detail-dialog";
import { StoreDetailsDialog } from "@/components/store-details-dialog";
import { useCustomTheme } from "@/hooks/use-custom-theme";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ProposalDiffViewer } from "@/components/proposal-diff-viewer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlignerChat } from "@/components/aligner-chat";
import { useOptionalProject } from "@/contexts/project-context";

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

interface CallHistoryComplete {
  id: string;
  conversationId: string;
  callDateTime: string;
  storeName: string;
  link: string;
  shippingAddress?: string;
  pocEmail?: string;
  pocName?: string;
  campaign: string;
  agentId: string;
  status: string;
  durationSecs: number;
  interestLevel: 'hot' | 'warm' | 'cold' | 'not-interested' | null;
  clientData?: any;
  storeRow?: any;
}

// KB Library Tab Component
function KBLibraryTab() {
  const { toast } = useToast();
  const projectContext = useOptionalProject();
  const currentProject = projectContext?.currentProject;
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [isDiffDialogOpen, setIsDiffDialogOpen] = useState(false);
  const [selectedVersionsForDiff, setSelectedVersionsForDiff] = useState<string[]>([]);
  const [isVersionDiffDialogOpen, setIsVersionDiffDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [viewingVersion, setViewingVersion] = useState<any | null>(null);
  const [isVersionViewerOpen, setIsVersionViewerOpen] = useState(false);
  const [selectedProposalIds, setSelectedProposalIds] = useState<string[]>([]);
  const [splitScreenMode, setSplitScreenMode] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (!desktop && splitScreenMode) {
        setSplitScreenMode(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [splitScreenMode]);

  // Fetch user preferences (load split-screen preference)
  const { data: userPrefs } = useQuery<{ splitScreenProposals?: boolean }>({
    queryKey: ['/api/user/preferences'],
  });

  // Load split-screen preference on mount
  useEffect(() => {
    if (userPrefs?.splitScreenProposals && isDesktop) {
      setSplitScreenMode(true);
    }
  }, [userPrefs, isDesktop]);

  // Save split-screen preference
  const saveSplitScreenMutation = useMutation({
    mutationFn: (enabled: boolean) => apiRequest('PUT', '/api/user/preferences', { splitScreenProposals: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
    },
  });

  // Toggle split-screen mode
  const toggleSplitScreen = (checked: boolean) => {
    setSplitScreenMode(checked);
    saveSplitScreenMutation.mutate(checked);
    
    // If disabling split mode, clear the selected proposal
    if (!checked) {
      setSelectedProposal(null);
      setIsDiffDialogOpen(false);
    }
  };

  // Fetch KB files
  const { data: kbData, isLoading: kbLoading } = useQuery({
    queryKey: ['/api/kb/files', currentProject?.id],
    queryFn: async () => {
      const url = new URL('/api/kb/files', window.location.origin);
      if (currentProject?.id) {
        url.searchParams.set('projectId', currentProject.id);
      }
      const response = await fetch(url.toString(), { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch KB files');
      return response.json();
    },
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
      const parts = [];
      if (data.pushedCount > 0) parts.push(`Pushed ${data.pushedCount} to ElevenLabs`);
      if (data.pulledCount > 0) parts.push(`Pulled ${data.pulledCount} from ElevenLabs`);
      if (data.createdLocal > 0) parts.push(`${data.createdLocal} new local`);
      if (data.createdRemote > 0) parts.push(`${data.createdRemote} new remote`);
      if (data.skipped > 0) parts.push(`${data.skipped} unchanged`);
      
      const description = parts.length > 0 ? parts.join(', ') : 'All files in sync';
      
      toast({
        title: "Sync Complete",
        description,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/kb/files'] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync with ElevenLabs",
        variant: "destructive",
      });
    },
  });

  // Batch upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      console.log('[KB Upload] Preparing to upload', files.length, 'files');
      const formData = new FormData();
      files.forEach((file, idx) => {
        console.log(`[KB Upload] Adding file ${idx + 1}:`, file.name, file.size, 'bytes');
        formData.append('files', file);
      });
      if (currentProject?.id) {
        formData.append('projectId', currentProject.id);
      }

      console.log('[KB Upload] Sending request...');
      const response = await fetch('/api/kb/upload-batch', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      console.log('[KB Upload] Response status:', response.status);
      if (!response.ok) {
        const error = await response.json();
        console.error('[KB Upload] Error:', error);
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      console.log('[KB Upload] Success:', result);
      return result;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Upload Complete",
        description: `Imported ${data.imported} new files, updated ${data.updated} existing files. ${data.skipped} skipped.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/kb/files'] });
      setUploadProgress(null);
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      });
      setUploadProgress(null);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    console.log('[KB Upload] Files selected:', files?.length);
    if (files && files.length > 0) {
      setUploadProgress({ current: 0, total: files.length });
      // Convert FileList to Array before passing to mutation
      const filesArray = Array.from(files);
      uploadMutation.mutate(filesArray);
    } else {
      console.log('[KB Upload] No files selected');
    }
    // Reset input so same files can be selected again
    e.target.value = '';
  };

  // Approve proposal mutation
  const approveMutation = useMutation({
    mutationFn: (proposalId: string) => apiRequest('POST', `/api/kb/proposals/${proposalId}/approve`),
    onSuccess: (data: any) => {
      // Show detailed sync status with agent count
      if (data.elevenlabsSynced) {
        const agentsUpdated = data.agentsUpdated || 0;
        const agentText = agentsUpdated > 0 
          ? ` (${agentsUpdated} agent${agentsUpdated !== 1 ? 's' : ''} updated)` 
          : '';
        
        toast({
          title: "Proposal Approved",
          description: `Version ${data.version.versionNumber} created and synced to ElevenLabs${agentText}`,
        });
      } else if (data.syncError) {
        toast({
          title: "Partially Completed",
          description: `Version ${data.version.versionNumber} created locally, but ElevenLabs sync failed: ${data.syncError}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Proposal Approved",
          description: `Version ${data.version.versionNumber} created (no ElevenLabs config found)`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/kb/proposals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kb/files'] });
      setIsDiffDialogOpen(false);
      setSelectedProposal(null);
    },
    onError: (error: any) => {
      // Check if this is a 422 error with detailed edit failures
      if (error.failedEdits && Array.isArray(error.failedEdits)) {
        const failureDetails = error.failedEdits.map((f: any) => 
          `• Edit ${f.editNumber}: ${f.reason}`
        ).join('\n');
        
        toast({
          title: `${error.failedCount} of ${error.totalEdits} Edits Failed`,
          description: failureDetails.substring(0, 300) + (failureDetails.length > 300 ? '...' : ''),
          variant: "destructive",
          duration: 10000, // Show longer for detailed errors
        });
      } else {
        toast({
          title: "Approval Failed",
          description: error.message || error.error || "Failed to approve proposal",
          variant: "destructive",
        });
      }
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

  // Delete selected proposals mutation
  const deleteProposalsMutation = useMutation({
    mutationFn: async (proposalIds: string[]) => {
      // Delete each proposal individually
      const results = await Promise.all(
        proposalIds.map(id => apiRequest('DELETE', `/api/kb/proposals/${id}`))
      );
      return results;
    },
    onSuccess: (_, proposalIds) => {
      toast({
        title: "Proposals Deleted",
        description: `Successfully deleted ${proposalIds.length} proposal(s)`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/kb/proposals'] });
      setSelectedProposalIds([]);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete proposals",
        variant: "destructive",
      });
    },
  });

  // Toggle proposal selection
  const toggleProposalSelection = (proposalId: string) => {
    setSelectedProposalIds(prev =>
      prev.includes(proposalId)
        ? prev.filter(id => id !== proposalId)
        : [...prev, proposalId]
    );
  };

  // Toggle all proposals (only selects visible proposals in table)
  const toggleAllProposals = () => {
    const visibleProposalIds = proposals.map((p: any) => p.id);
    const allVisibleSelected = visibleProposalIds.every(id => selectedProposalIds.includes(id));
    
    if (allVisibleSelected) {
      // Deselect all visible proposals
      setSelectedProposalIds(prev => prev.filter(id => !visibleProposalIds.includes(id)));
    } else {
      // Select all visible proposals (merge with existing selection)
      setSelectedProposalIds(prev => [...new Set([...prev, ...visibleProposalIds])]);
    }
  };

  // Delete selected proposals
  const handleDeleteSelected = () => {
    if (selectedProposalIds.length === 0) return;
    deleteProposalsMutation.mutate(selectedProposalIds);
  };

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

  // View full version content
  const viewVersionContent = (version: any) => {
    setViewingVersion(version);
    setIsVersionViewerOpen(true);
  };

  // Load version into KB Editor
  const loadVersionToEditor = (version: any) => {
    if (!selectedFileId) return;
    
    // Create a temporary "edit" that loads this version's content
    toast({
      title: "Version Loaded",
      description: `Version ${version.versionNumber} loaded into editor. You can now review and save if needed.`,
    });
    
    // Close dialogs and navigate to editor
    setIsVersionViewerOpen(false);
    setIsVersionDialogOpen(false);
    
    // Trigger a refresh of the KB Editor with this content
    // The KB Editor will need to handle loading this version's content
    queryClient.setQueryData(['/api/kb/files'], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        files: old.files.map((f: any) => 
          f.id === selectedFileId
            ? { ...f, currentContent: version.content }
            : f
        ),
      };
    });
  };

  // Get versions for diff comparison
  const version1 = versions.find((v: any) => v.id === selectedVersionsForDiff[0]);
  const version2 = versions.find((v: any) => v.id === selectedVersionsForDiff[1]);

  // Render split-screen layout (when split mode enabled)
  if (splitScreenMode) {
    return (
      <div className="flex gap-4 h-full">
        {/* Left: KB Library (50%) */}
        <div className="w-1/2">
          <Card data-testid="card-kb-library">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Knowledge Base Library
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Manage ElevenLabs knowledge base files
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div>
                    <input
                      id="kb-file-upload-split"
                      type="file"
                      multiple
                      accept=".txt"
                      onChange={handleFileSelect}
                      className="hidden"
                      data-testid="input-upload-files-split"
                    />
                    <Button
                      size="sm"
                      onClick={() => document.getElementById('kb-file-upload-split')?.click()}
                      disabled={uploadMutation.isPending}
                      data-testid="button-upload-kb-split"
                    >
                      {uploadMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </>
                      )}
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending}
                    data-testid="button-sync-kb-split"
                  >
                    {syncMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Sync
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <KBEditor />
            </CardContent>
          </Card>
        </div>

        {/* Right: Proposal Viewer (50%) */}
        <div className="w-1/2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Review Proposed Changes</CardTitle>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="split-screen-toggle-header"
                      checked={splitScreenMode}
                      onCheckedChange={toggleSplitScreen}
                      data-testid="checkbox-split-screen-header"
                    />
                    <Label htmlFor="split-screen-toggle-header" className="cursor-pointer text-sm">
                      Editor/Proposal View
                    </Label>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedProposal ? (
                <ProposalDiffViewer
                  proposal={selectedProposal}
                  currentContent={selectedFile?.currentContent || ''}
                  proposedContent={selectedProposal.proposedContent}
                  filename={selectedFile?.filename || 'Unknown'}
                  onApprove={() => {
                    approveMutation.mutate(selectedProposal.id);
                  }}
                  onReject={() => {
                    rejectMutation.mutate(selectedProposal.id);
                  }}
                  isApproving={approveMutation.isPending}
                  isRejecting={rejectMutation.isPending}
                />
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">Select a proposal to review:</p>
                  {proposalsLoading ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground mt-4">Loading proposals...</p>
                    </div>
                  ) : pendingProposals.length === 0 ? (
                    <div className="text-center py-12 bg-muted/20 rounded-lg">
                      <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        No pending proposals yet. Run an AI analysis to generate improvement suggestions.
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File</TableHead>
                          <TableHead>Rationale</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingProposals.map((proposal: any) => (
                          <TableRow key={proposal.id} data-testid={`row-proposal-split-${proposal.id}`}>
                            <TableCell className="font-medium" data-testid={`text-proposal-file-split-${proposal.id}`}>
                              {kbFiles.find((f: any) => f.id === proposal.kbFileId)?.filename || 'Unknown'}
                            </TableCell>
                            <TableCell className="max-w-md truncate" data-testid={`text-proposal-rationale-split-${proposal.id}`}>
                              {proposal.rationale}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground" data-testid={`text-proposal-date-split-${proposal.id}`}>
                              {new Date(proposal.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedProposal(proposal)}
                                data-testid={`button-view-diff-split-${proposal.id}`}
                              >
                                View Diff
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
          <div className="flex gap-2">
            <div>
              <input
                id="kb-file-upload"
                type="file"
                multiple
                accept=".txt"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-upload-files"
              />
              <Button
                onClick={() => document.getElementById('kb-file-upload')?.click()}
                disabled={uploadMutation.isPending}
                data-testid="button-upload-kb"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </>
                )}
              </Button>
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
              Sync KB Files
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="files" data-testid="tabs-kb-sections">
          <TabsList className="mb-4">
            <TabsTrigger value="files" data-testid="tab-files">
              Files ({kbFiles.length})
            </TabsTrigger>
            <TabsTrigger value="editor" data-testid="tab-editor">
              Editor
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
                  No knowledge base files found. Click "Upload Files" to import your local KB files.
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

          {/* Editor Tab */}
          <TabsContent value="editor">
            <KBEditor />
          </TabsContent>

          {/* Proposals Tab */}
          <TabsContent value="proposals">
            {isDesktop && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-muted/30 rounded-lg border">
                <Checkbox
                  id="split-screen-toggle"
                  checked={splitScreenMode}
                  onCheckedChange={toggleSplitScreen}
                  data-testid="checkbox-split-screen"
                />
                <Label htmlFor="split-screen-toggle" className="cursor-pointer text-sm">
                  Editor/Proposal View
                </Label>
              </div>
            )}
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
              <div className="space-y-4">
                {selectedProposalIds.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">
                      {selectedProposalIds.length} proposal(s) selected
                    </p>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDeleteSelected}
                      disabled={deleteProposalsMutation.isPending}
                      data-testid="button-delete-selected"
                    >
                      {deleteProposalsMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Deleting...
                        </>
                      ) : (
                        `Delete Selected`
                      )}
                    </Button>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={proposals.length > 0 && proposals.every((p: any) => selectedProposalIds.includes(p.id))}
                          onChange={toggleAllProposals}
                          className="h-4 w-4"
                          data-testid="checkbox-select-all-proposals"
                        />
                      </TableHead>
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
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedProposalIds.includes(proposal.id)}
                            onChange={() => toggleProposalSelection(proposal.id)}
                            className="h-4 w-4"
                            data-testid={`checkbox-proposal-${proposal.id}`}
                          />
                        </TableCell>
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
              </div>
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
                      <div 
                        className="mt-2 p-3 bg-muted/50 rounded text-sm font-mono max-h-32 overflow-auto cursor-pointer hover-elevate active-elevate-2" 
                        data-testid={`text-version-content-${version.id}`}
                        onClick={() => viewVersionContent(version)}
                      >
                        {version.content.substring(0, 200)}
                        {version.content.length > 200 && '...'}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewVersionContent(version)}
                          data-testid={`button-view-full-${version.id}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Full Content
                        </Button>
                        {idx !== 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadVersionToEditor(version)}
                            data-testid={`button-load-version-${version.id}`}
                          >
                            <FileEdit className="h-4 w-4 mr-2" />
                            Load to Editor
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Proposal Diff Viewer Dialog (only shown when NOT in split-screen mode) */}
      <Dialog open={!splitScreenMode && isDiffDialogOpen} onOpenChange={setIsDiffDialogOpen}>
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

      {/* Version Viewer Dialog */}
      <Dialog open={isVersionViewerOpen} onOpenChange={setIsVersionViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]" data-testid="dialog-version-viewer">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle data-testid="text-version-viewer-title">
                View Version Content
                {viewingVersion && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    v{viewingVersion.versionNumber} - {viewingVersion.source}
                  </span>
                )}
              </DialogTitle>
              {viewingVersion && viewingVersion.versionNumber !== versions[0]?.versionNumber && (
                <Button
                  size="sm"
                  onClick={() => loadVersionToEditor(viewingVersion)}
                  data-testid="button-load-to-editor"
                >
                  <FileEdit className="h-4 w-4 mr-2" />
                  Load to Editor
                </Button>
              )}
            </div>
          </DialogHeader>
          <ScrollArea className="h-[70vh]" data-testid="scroll-version-content">
            {viewingVersion && (
              <div className="space-y-4">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Created: {new Date(viewingVersion.createdAt).toLocaleString()}</span>
                  <span>By: {viewingVersion.createdBy}</span>
                </div>
                <div className="p-4 bg-muted/30 rounded-md">
                  <pre className="text-sm font-mono whitespace-pre-wrap" data-testid="text-full-version-content">
                    {viewingVersion.content}
                  </pre>
                </div>
              </div>
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
    queryKey: ['/api/elevenlabs/eligible-stores', activeScenario],
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

              <div>
                <label className="text-sm font-medium mb-2 block">IVR & Voicemail Handling</label>
                <RadioGroup value={ivrBehavior} onValueChange={(v) => setIvrBehavior(v as 'flag_and_end' | 'flag_and_continue')} data-testid="radio-ivr-behavior">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="flag_and_end" id="flag_and_end" data-testid="radio-flag-end" />
                    <Label htmlFor="flag_and_end" className="font-normal">
                      Flag & End Call
                      <span className="block text-xs text-muted-foreground">Mark store as automated line and hang up immediately</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="flag_and_continue" id="flag_and_continue" data-testid="radio-flag-continue" />
                    <Label htmlFor="flag_and_continue" className="font-normal">
                      Flag & Navigate Menu
                      <span className="block text-xs text-muted-foreground">Mark store as automated line but try to navigate IVR system</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

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

                  {/* Filters - only show for cold_calls */}
                  {activeScenario === 'cold_calls' && (
                    <div className="flex gap-4">
                      {/* Agent Filter */}
                      {uniqueAgents.length > 0 && (
                        <div className="flex-1 border rounded-lg p-4">
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

                      {/* State Filter */}
                      {allStates.length > 0 && (
                        <div className="flex-1 border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium">Filter by State</h3>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" data-testid="button-state-filter">
                                  <Settings2 className="mr-2 h-4 w-4" />
                                  {selectedStateFilters.length > 0
                                    ? `${selectedStateFilters.length} state(s)`
                                    : "Select States"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent align="end" className="w-80">
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium">Filter by State</h4>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedStateFilters(allStates)}
                                        data-testid="button-select-all-states"
                                      >
                                        All
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedStateFilters([])}
                                        data-testid="button-clear-all-states"
                                      >
                                        None
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Canada Checkbox */}
                                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                    <Checkbox
                                      id="canada-toggle"
                                      checked={showCanadaOnly}
                                      onCheckedChange={(checked) => {
                                        setShowCanadaOnly(!!checked);
                                      }}
                                      data-testid="checkbox-canada-toggle"
                                    />
                                    <Label
                                      htmlFor="canada-toggle"
                                      className="text-sm cursor-pointer flex-1 font-medium"
                                    >
                                      Canada
                                    </Label>
                                    <span className="text-xs text-muted-foreground">
                                      ({allStates.filter(isCanadianProvince).reduce((sum, state) => sum + (stateCounts[state] || 0), 0)} stores)
                                    </span>
                                  </div>

                                  <ScrollArea className="h-64">
                                    <div className="space-y-2">
                                      {allStates
                                        .filter(state => showCanadaOnly ? isCanadianProvince(state) : true)
                                        .map((state) => (
                                        <div key={state} className="flex items-center gap-2">
                                          <Checkbox
                                            id={`state-${state}`}
                                            checked={selectedStateFilters.includes(state)}
                                            onCheckedChange={(checked) => handleStateChange(state, checked as boolean)}
                                            data-testid={`checkbox-state-${state}`}
                                          />
                                          <Label
                                            htmlFor={`state-${state}`}
                                            className="text-sm cursor-pointer flex-1"
                                          >
                                            {state}
                                          </Label>
                                          <span className="text-xs text-muted-foreground">
                                            ({stateCounts[state] || 0})
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          {selectedStateFilters.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {selectedStateFilters.map(state => (
                                <Badge key={state} variant="secondary" className="text-xs">
                                  {state} ({stateCounts[state] || 0})
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
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
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => {
                                      setCallToDelete(call.session.id);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                    data-testid={`button-delete-${call.session.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
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

          {canAccessAdminFeatures(user) && (
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
                  {/* NUKE Button */}
                  <Button 
                    variant="destructive"
                    onClick={() => setIsNukeDialogOpen(true)}
                    className="h-10"
                    data-testid="button-nuke-analysis"
                  >
                    <Bomb className="h-4 w-4 mr-2" />
                    NUKE
                  </Button>

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

                  {canAccessAdminFeatures(user) && (
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="auto-kb-analysis"
                        checked={preferences?.autoKbAnalysis || false}
                        onCheckedChange={(checked) => {
                          updatePreferencesMutation.mutate({ autoKbAnalysis: checked === true });
                        }}
                        data-testid="checkbox-auto-kb-analysis"
                      />
                      <Label htmlFor="auto-kb-analysis" className="text-sm cursor-pointer">
                        Auto-trigger
                      </Label>
                      {preferences?.autoKbAnalysis && (
                        <>
                          <span className="text-xs text-muted-foreground">after</span>
                          <Input
                            id="kb-analysis-threshold"
                            type="number"
                            min="1"
                            max="100"
                            value={preferences?.kbAnalysisThreshold || 10}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (value >= 1 && value <= 100) {
                                updatePreferencesMutation.mutate({ kbAnalysisThreshold: value });
                              }
                            }}
                            className="w-16 h-8"
                            data-testid="input-kb-analysis-threshold"
                          />
                          <span className="text-xs text-muted-foreground">calls</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Dual Progress Bubbles */}
                {(wickCoachStatus !== 'idle' || alignerStatus !== 'idle') && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="container-workflow-progress">
                    {/* Wick Coach Bubble */}
                    <Card className={`border-2 ${
                      wickCoachStatus === 'complete' ? 'border-green-500 bg-green-50 dark:bg-green-950' :
                      wickCoachStatus === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-950' :
                      wickCoachStatus === 'running' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' :
                      'border-gray-300 bg-gray-50 dark:bg-gray-900'
                    }`} data-testid="card-wick-coach-status">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                          {wickCoachStatus === 'running' && (
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                          )}
                          {wickCoachStatus === 'complete' && (
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          )}
                          {wickCoachStatus === 'error' && (
                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          )}
                          <div className="flex-1">
                            <p className={`font-semibold ${
                              wickCoachStatus === 'complete' ? 'text-green-900 dark:text-green-100' :
                              wickCoachStatus === 'error' ? 'text-red-900 dark:text-red-100' :
                              wickCoachStatus === 'running' ? 'text-blue-900 dark:text-blue-100' :
                              'text-gray-900 dark:text-gray-100'
                            }`}>Wick Coach</p>
                            <p className={`text-sm ${
                              wickCoachStatus === 'complete' ? 'text-green-700 dark:text-green-300' :
                              wickCoachStatus === 'error' ? 'text-red-700 dark:text-red-300' :
                              wickCoachStatus === 'running' ? 'text-blue-700 dark:text-blue-300' :
                              'text-gray-700 dark:text-gray-300'
                            }`}>
                              {wickCoachStatus === 'running' && 'Analyzing calls...'}
                              {wickCoachStatus === 'complete' && `Analyzed ${wickCoachCallCount} call${wickCoachCallCount !== 1 ? 's' : ''}`}
                              {wickCoachStatus === 'error' && (wickCoachError || "Analysis failed")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Aligner Bubble */}
                    <Card className={`border-2 ${
                      alignerStatus === 'complete' ? 'border-green-500 bg-green-50 dark:bg-green-950' :
                      alignerStatus === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-950' :
                      alignerStatus === 'running' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' :
                      'border-gray-300 bg-gray-50 dark:bg-gray-900'
                    }`} data-testid="card-aligner-status">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                          {alignerStatus === 'running' && (
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                          )}
                          {alignerStatus === 'complete' && (
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          )}
                          {alignerStatus === 'error' && (
                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          )}
                          <div className="flex-1">
                            <p className={`font-semibold ${
                              alignerStatus === 'complete' ? 'text-green-900 dark:text-green-100' :
                              alignerStatus === 'error' ? 'text-red-900 dark:text-red-100' :
                              alignerStatus === 'running' ? 'text-blue-900 dark:text-blue-100' :
                              'text-gray-900 dark:text-gray-100'
                            }`}>Aligner (Strategist)</p>
                            <p className={`text-sm ${
                              alignerStatus === 'complete' ? 'text-green-700 dark:text-green-300' :
                              alignerStatus === 'error' ? 'text-red-700 dark:text-red-300' :
                              alignerStatus === 'running' ? 'text-blue-700 dark:text-blue-300' :
                              'text-gray-700 dark:text-gray-300'
                            }`}>
                              {alignerStatus === 'idle' && 'Waiting for Wick Coach...'}
                              {alignerStatus === 'running' && 'Analyzing calls and KB files...'}
                              {alignerStatus === 'complete' && `Completed: ${alignerCallCount} calls, ${alignerKbFileCount} KB files`}
                              {alignerStatus === 'error' && (alignerError || "Analysis failed")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

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
                              <YAxis 
                                label={{ value: 'Percentage', angle: -90, position: 'insideLeft' }} 
                                domain={[0, 100]}
                                tickFormatter={(value) => `${value}%`}
                              />
                              <Tooltip formatter={(value) => `${value}%`} />
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
                              <div 
                                key={insight.id} 
                                className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover-elevate ${
                                  selectedInsightId === insight.id ? 'border-primary bg-primary/5' : ''
                                }`}
                                onClick={() => loadHistoricalInsight(insight)}
                                data-testid={`historical-insight-${idx}`}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="font-medium">{new Date(insight.analyzedAt).toLocaleDateString()}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {insight.callCount} calls
                                    </Badge>
                                  </div>
                                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                    <span className="text-green-600">+{insight.sentimentPositive ?? 0}%</span>
                                    <span className="text-yellow-600">~{insight.sentimentNeutral ?? 0}%</span>
                                    <span className="text-red-600">-{insight.sentimentNegative ?? 0}%</span>
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {insight.commonObjections?.length || 0} objections, {insight.successPatterns?.length || 0} patterns
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* View Mode Toggle */}
                {insightsHistory && insightsHistory.length > 0 && persistedInsights && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center gap-2">
                      <Button
                        variant={insightsViewMode === 'individual' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setInsightsViewMode('individual')}
                        data-testid="button-view-individual"
                      >
                        Individual Analysis
                      </Button>
                      <Button
                        variant={insightsViewMode === 'all-time' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setInsightsViewMode('all-time');
                          setSelectedInsightId(null);
                        }}
                        data-testid="button-view-all-time"
                      >
                        All-Time Summary
                      </Button>
                    </div>
                  </div>
                )}

                {/* Insights Results */}
                {persistedInsights && insightsViewMode === 'individual' && (
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
                                          const callData = filteredAnalyticsData?.calls.find(
                                            call => call.session.conversationId === example.conversationId
                                          ) || null;
                                          setSelectedCallForDialog({ 
                                            conversationId: example.conversationId, 
                                            callData 
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
                                          const callData = filteredAnalyticsData?.calls.find(
                                            call => call.session.conversationId === example.conversationId
                                          ) || null;
                                          setSelectedCallForDialog({ 
                                            conversationId: example.conversationId, 
                                            callData 
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

                {/* All-Time Summary View */}
                {insightsViewMode === 'all-time' && insightsHistory && insightsHistory.length > 0 && (() => {
                  const allTimeSummary = computeAllTimeSummary();
                  if (!allTimeSummary) return null;
                  
                  return (
                    <div className="space-y-6 mt-6">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Aggregated across {allTimeSummary.analysisCount} analyses • {allTimeSummary.callCount} total calls
                      </div>

                      {/* Common Objections - All Time */}
                      {allTimeSummary.commonObjections && allTimeSummary.commonObjections.length > 0 && (
                        <Card data-testid="card-all-time-objections">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <MessageSquare className="h-5 w-5" />
                              Top Objections (All Time)
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {allTimeSummary.commonObjections.map((objection: any, idx: number) => (
                                <div key={idx} className="border rounded-lg p-4" data-testid={`all-time-objection-${idx}`}>
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium">{objection.objection}</p>
                                    <Badge variant="secondary" data-testid={`all-time-objection-frequency-${idx}`}>
                                      {objection.frequency}x
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Success Patterns - All Time */}
                      {allTimeSummary.successPatterns && allTimeSummary.successPatterns.length > 0 && (
                        <Card data-testid="card-all-time-patterns">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <TrendingUp className="h-5 w-5 text-green-500" />
                              Top Success Patterns (All Time)
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {allTimeSummary.successPatterns.map((pattern: any, idx: number) => (
                                <div key={idx} className="border rounded-lg p-4" data-testid={`all-time-pattern-${idx}`}>
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium">{pattern.pattern}</p>
                                    <Badge variant="secondary" data-testid={`all-time-pattern-frequency-${idx}`}>
                                      {pattern.frequency}x
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Sentiment Analysis - All Time */}
                      {allTimeSummary.sentimentAnalysis && (
                        <Card data-testid="card-all-time-sentiment">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <BarChart3 className="h-5 w-5" />
                              Average Sentiment (All Time)
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-500">
                                  {allTimeSummary.sentimentAnalysis.positive}%
                                </div>
                                <p className="text-sm text-muted-foreground">Positive</p>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-yellow-500">
                                  {allTimeSummary.sentimentAnalysis.neutral}%
                                </div>
                                <p className="text-sm text-muted-foreground">Neutral</p>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-red-500">
                                  {allTimeSummary.sentimentAnalysis.negative}%
                                </div>
                                <p className="text-sm text-muted-foreground">Negative</p>
                              </div>
                            </div>
                            {allTimeSummary.sentimentAnalysis.trends && (
                              <p className="text-sm text-muted-foreground border-t pt-4">
                                {allTimeSummary.sentimentAnalysis.trends}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* Coaching Recommendations - All Time */}
                      {allTimeSummary.coachingRecommendations && allTimeSummary.coachingRecommendations.length > 0 && (
                        <Card data-testid="card-all-time-recommendations">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <Lightbulb className="h-5 w-5 text-yellow-500" />
                              Key Coaching Recommendations (All Time)
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {allTimeSummary.coachingRecommendations.map((rec: any, idx: number) => (
                                <div key={idx} className="border rounded-lg p-4" data-testid={`all-time-recommendation-${idx}`}>
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <p className="font-medium">{rec.title}</p>
                                    <Badge 
                                      variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}
                                      data-testid={`all-time-recommendation-priority-${idx}`}
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
                  );
                })()}

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

          {/* Aligner Chat Tab */}
          {canAccessAdminFeatures(user) && (
            <TabsContent value="aligner-chat" className="space-y-6">
              <Card data-testid="card-aligner-chat">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    Aligner Chat
                  </CardTitle>
                  <CardDescription>
                    Have a conversation with the Aligner about call patterns, KB improvements, and sales strategy
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[600px]">
                    <AlignerChat />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* KB Library Tab */}
          {canAccessAdminFeatures(user) && (
            <TabsContent value="kb-library" className="space-y-6">
              <KBLibraryTab />
            </TabsContent>
          )}

          {/* Call History Tab */}
          <TabsContent value="call-history" className="space-y-6">
            <Card data-testid="card-call-history">
              <CardHeader>
                <CardTitle>Complete Call History</CardTitle>
                <CardDescription>
                  Chronological list of all ElevenLabs calls with store details, status, and extracted data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* Date Range */}
                  <div className="space-y-1">
                    <Label className="text-xs">Start Date</Label>
                    <Input
                      type="date"
                      value={historyStartDate}
                      onChange={(e) => {
                        setHistoryStartDate(e.target.value);
                        setHistoryPage(1);
                      }}
                      className="h-8 text-xs"
                      data-testid="input-history-start-date"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End Date</Label>
                    <Input
                      type="date"
                      value={historyEndDate}
                      onChange={(e) => {
                        setHistoryEndDate(e.target.value);
                        setHistoryPage(1);
                      }}
                      className="h-8 text-xs"
                      data-testid="input-history-end-date"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={historyStatusFilter} onValueChange={(value) => { setHistoryStatusFilter(value); setHistoryPage(1); }}>
                      <SelectTrigger className="h-8 text-xs" data-testid="select-history-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="call-ended-by-assistant">Ended by Assistant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Campaign Filter */}
                  <div className="space-y-1">
                    <Label className="text-xs">Campaign</Label>
                    <Select value={historyCampaignFilter} onValueChange={(value) => { setHistoryCampaignFilter(value); setHistoryPage(1); }}>
                      <SelectTrigger className="h-8 text-xs" data-testid="select-history-campaign">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="cold_calls">Cold Calls</SelectItem>
                        <SelectItem value="follow_ups">Follow-Ups</SelectItem>
                        <SelectItem value="recovery">Recovery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Agent Filter */}
                  <div className="space-y-1">
                    <Label className="text-xs">Agent ID</Label>
                    <Select value={historyAgentFilter} onValueChange={(value) => { setHistoryAgentFilter(value); setHistoryPage(1); }}>
                      <SelectTrigger className="h-8 text-xs" data-testid="select-history-agent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {agents.map((agent) => (
                          <SelectItem key={agent.agent_id} value={agent.agent_id}>
                            {agent.name} ({agent.agent_id.slice(0, 8)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Search Input */}
                <div className="w-full md:w-96">
                  <Input
                    placeholder="Search store name, POC name, or agent ID..."
                    value={historySearchQuery}
                    onChange={(e) => {
                      setHistorySearchQuery(e.target.value);
                      setHistoryPage(1);
                    }}
                    className="h-8 text-xs"
                    data-testid="input-history-search"
                  />
                </div>

                {/* Table */}
                {(() => {
                  // Transform analytics data into call history format
                  const transformedData: CallHistoryComplete[] = (analyticsData?.calls || []).map((call) => {
                    const clientData = call.client.data || {};
                    const storeSnapshot = call.session.storeSnapshot || {};
                    
                    return {
                      id: call.session.id,
                      conversationId: call.session.conversationId,
                      callDateTime: call.session.startedAt,
                      storeName: clientData.business_name || clientData.businessName || storeSnapshot.business_name || 'Unknown Store',
                      link: call.client.uniqueIdentifier || clientData.link || '',
                      shippingAddress: clientData.shipping_address || storeSnapshot.shipping_address,
                      pocEmail: clientData.poc_email || storeSnapshot.poc_email,
                      pocName: clientData.poc_name || storeSnapshot.poc_name,
                      campaign: clientData.scenario || storeSnapshot.scenario || 'cold_calls',
                      agentId: call.session.agentId,
                      status: call.session.status,
                      durationSecs: call.session.callDurationSecs || 0,
                      interestLevel: call.session.interestLevel,
                      clientData: call.client,
                    };
                  });

                  // Apply filters
                  const filteredData = transformedData.filter((row) => {
                    // Date range filter
                    if (historyStartDate && new Date(row.callDateTime) < new Date(historyStartDate)) return false;
                    if (historyEndDate && new Date(row.callDateTime) > new Date(historyEndDate + 'T23:59:59')) return false;

                    // Status filter
                    if (historyStatusFilter !== 'all' && row.status !== historyStatusFilter) return false;

                    // Campaign filter
                    if (historyCampaignFilter !== 'all' && row.campaign !== historyCampaignFilter) return false;

                    // Agent filter
                    if (historyAgentFilter !== 'all' && row.agentId !== historyAgentFilter) return false;

                    // Search query
                    if (historySearchQuery) {
                      const query = historySearchQuery.toLowerCase();
                      const matchesStore = row.storeName.toLowerCase().includes(query);
                      const matchesPOC = row.pocName?.toLowerCase().includes(query);
                      const matchesAgent = row.agentId.toLowerCase().includes(query);
                      if (!matchesStore && !matchesPOC && !matchesAgent) return false;
                    }

                    return true;
                  });

                  // Sort by date descending (most recent first)
                  const sortedData = [...filteredData].sort((a, b) => 
                    new Date(b.callDateTime).getTime() - new Date(a.callDateTime).getTime()
                  );

                  // Pagination
                  const itemsPerPage = 20;
                  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
                  const paginatedData = sortedData.slice(
                    (historyPage - 1) * itemsPerPage,
                    historyPage * itemsPerPage
                  );

                  // Format date helper
                  const formatDate = (dateString: string) => {
                    const date = new Date(dateString);
                    const month = date.toLocaleString('en-US', { month: 'short' });
                    const day = date.getDate();
                    const time = date.toLocaleString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    });
                    return `${month} ${day}, ${time}`;
                  };

                  // Format duration helper
                  const formatDuration = (secs: number) => {
                    const mins = Math.floor(secs / 60);
                    const remainingSecs = secs % 60;
                    return `${mins}m ${remainingSecs}s`;
                  };

                  // Get interest level badge variant
                  const getInterestBadgeVariant = (level: string | null) => {
                    if (!level) return 'secondary';
                    if (level === 'hot') return 'default';
                    if (level === 'warm') return 'secondary';
                    return 'outline';
                  };

                  // Get interest level label
                  const getInterestLabel = (level: string | null) => {
                    if (!level) return 'None';
                    if (level === 'hot') return 'High';
                    if (level === 'warm') return 'Medium';
                    if (level === 'cold') return 'Low';
                    if (level === 'not-interested') return 'None';
                    return level;
                  };

                  // Get status badge variant
                  const getStatusBadgeVariant = (status: string) => {
                    if (status === 'completed') return 'default';
                    if (status === 'failed') return 'destructive';
                    return 'secondary';
                  };

                  // Get campaign label
                  const getCampaignLabel = (campaign: string) => {
                    if (campaign === 'cold_calls') return 'Cold Calls';
                    if (campaign === 'follow_ups') return 'Follow-Ups';
                    if (campaign === 'recovery') return 'Recovery';
                    return campaign;
                  };

                  return (
                    <>
                      {analyticsLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : sortedData.length === 0 ? (
                        <div className="text-center py-12 text-sm text-muted-foreground">
                          No call history found. Try adjusting your filters.
                        </div>
                      ) : (
                        <>
                          <div className="border rounded-md">
                            <Table>
                              <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                  <TableHead className="text-xs px-2 py-1">Date & Time</TableHead>
                                  <TableHead className="text-xs px-2 py-1">Store</TableHead>
                                  <TableHead className="text-xs px-2 py-1">Campaign</TableHead>
                                  <TableHead className="text-xs px-2 py-1">Agent ID</TableHead>
                                  <TableHead className="text-xs px-2 py-1">Status</TableHead>
                                  <TableHead className="text-xs px-2 py-1">Duration</TableHead>
                                  <TableHead className="text-xs px-2 py-1">Interest</TableHead>
                                  <TableHead className="text-xs px-2 py-1">POC Name</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {paginatedData.map((row, idx) => (
                                  <TableRow 
                                    key={row.id} 
                                    className="hover:bg-muted/50"
                                    data-testid={`call-history-row-${idx}`}
                                  >
                                    <TableCell className="text-xs px-2 py-1.5">
                                      {formatDate(row.callDateTime)}
                                    </TableCell>
                                    <TableCell className="text-xs px-2 py-1.5">
                                      <button
                                        onClick={async () => {
                                          if (!row.link) {
                                            toast({
                                              title: "Error",
                                              description: "Store link not found",
                                              variant: "destructive",
                                            });
                                            return;
                                          }
                                          
                                          // Set loading state for this specific row
                                          setStoreDetailsLoading(row.id);
                                          
                                          try {
                                            // Fetch full store row from Google Sheets
                                            const response = await fetch(
                                              `/api/stores/by-link?link=${encodeURIComponent(row.link)}`
                                            );
                                            
                                            if (!response.ok) {
                                              throw new Error('Failed to fetch store details');
                                            }
                                            
                                            const { storeRow, meta } = await response.json();
                                            
                                            // Add metadata to row for StoreDetailsDialog
                                            const rowWithMeta = {
                                              ...storeRow,
                                              meta: {
                                                rowIndex: meta.rowIndex,
                                                storeSheetId: meta.storeSheetId,
                                              }
                                            };
                                            
                                            // Open dialog with full store row and metadata
                                            setStoreDetailsDialog({
                                              open: true,
                                              row: rowWithMeta,
                                            });
                                          } catch (error: any) {
                                            toast({
                                              title: "Error",
                                              description: error.message || "Failed to load store details",
                                              variant: "destructive",
                                            });
                                          } finally {
                                            // Always clear loading state
                                            setStoreDetailsLoading(null);
                                          }
                                        }}
                                        className="text-primary hover:underline text-left inline-flex items-center gap-1"
                                        disabled={storeDetailsLoading === row.id}
                                        data-testid={`store-link-${idx}`}
                                      >
                                        {storeDetailsLoading === row.id && (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        )}
                                        {row.storeName}
                                      </button>
                                    </TableCell>
                                    <TableCell className="text-xs px-2 py-1.5">
                                      {getCampaignLabel(row.campaign)}
                                    </TableCell>
                                    <TableCell className="text-xs px-2 py-1.5 font-mono">
                                      {row.agentId.slice(0, 8)}...
                                    </TableCell>
                                    <TableCell className="text-xs px-2 py-1.5">
                                      <Badge variant={getStatusBadgeVariant(row.status)} className="text-xs">
                                        {row.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs px-2 py-1.5">
                                      {formatDuration(row.durationSecs)}
                                    </TableCell>
                                    <TableCell className="text-xs px-2 py-1.5">
                                      <Badge variant={getInterestBadgeVariant(row.interestLevel)} className="text-xs">
                                        {getInterestLabel(row.interestLevel)}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs px-2 py-1.5">
                                      {row.pocName || '-'}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Pagination */}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-4">
                              <div className="text-xs text-muted-foreground">
                                Showing {((historyPage - 1) * itemsPerPage) + 1} to {Math.min(historyPage * itemsPerPage, sortedData.length)} of {sortedData.length} calls
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                  disabled={historyPage === 1}
                                  data-testid="button-history-prev"
                                >
                                  Previous
                                </Button>
                                <div className="text-xs text-muted-foreground">
                                  Page {historyPage} of {totalPages}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                                  disabled={historyPage === totalPages}
                                  data-testid="button-history-next"
                                >
                                  Next
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent data-testid="dialog-delete-call">
          <DialogHeader>
            <DialogTitle>Delete Call</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this call? This will permanently remove it from both ElevenLabs and your local database.
            </p>
            <p className="text-sm font-medium text-destructive">
              This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setCallToDelete(null);
              }}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (callToDelete) {
                  deleteCallMutation.mutate(callToDelete);
                }
              }}
              disabled={deleteCallMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteCallMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Call'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Store Details Dialog */}
      {storeDetailsDialog && (
        <StoreDetailsDialog
          open={storeDetailsDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              setStoreDetailsDialog(null);
            }
          }}
          row={storeDetailsDialog.row}
          trackerSheetId={trackerSheetId}
          storeSheetId={storeSheetId}
          refetch={refetchAnalytics}
          currentColors={currentColors}
          statusOptions={statusOptions}
          statusColors={statusColors}
          contextUpdateTrigger={contextUpdateTrigger}
          setContextUpdateTrigger={setContextUpdateTrigger}
          loadDefaultScriptTrigger={0}
        />
      )}

      {/* NUKE Analysis Data Confirmation Dialog */}
      <AlertDialog open={isNukeDialogOpen} onOpenChange={setIsNukeDialogOpen}>
        <AlertDialogContent data-testid="dialog-nuke-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Bomb className="h-5 w-5" />
              Clear All Analysis Data?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p>This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All AI Insights (Wick Coach analysis)</li>
                <li>All KB Change Proposals (Aligner suggestions)</li>
                <li>All objections, patterns, and recommendations</li>
                <li>Reset all call timestamps (allows re-analysis)</li>
              </ul>
              <p className="font-semibold text-destructive pt-2">
                This action cannot be undone!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-nuke">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => nukeAnalysisMutation.mutate()}
              disabled={nukeAnalysisMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-nuke"
            >
              {nukeAnalysisMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Nuking...
                </>
              ) : (
                <>
                  <Bomb className="h-4 w-4 mr-2" />
                  NUKE IT
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* NUKE Call Data Confirmation Dialog */}
      <AlertDialog open={isNukeCallDataDialogOpen} onOpenChange={setIsNukeCallDataDialogOpen}>
        <AlertDialogContent data-testid="dialog-nuke-call-data-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Bomb className="h-5 w-5" />
              Clear All Call Test Data?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p>This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All call sessions (active, queued, completed)</li>
                <li>All call history records</li>
                <li>All call transcripts</li>
                <li>All call events</li>
                <li>All campaign targets</li>
                <li>Conversations from ElevenLabs (via API)</li>
              </ul>
              <p className="font-semibold text-destructive pt-2">
                This action cannot be undone!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-nuke-call-data">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => nukeCallDataMutation.mutate()}
              disabled={nukeCallDataMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-nuke-call-data"
            >
              {nukeCallDataMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Nuking...
                </>
              ) : (
                <>
                  <Bomb className="h-4 w-4 mr-2" />
                  NUKE IT
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
