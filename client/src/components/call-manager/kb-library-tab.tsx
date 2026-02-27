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
import { CallDetailDialog } from "@/components/call-detail-dialog";
import { StoreDetailsDialog } from "@/components/store-details-dialog";
import { useCustomTheme } from "@/hooks/use-custom-theme";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ProposalDiffViewer } from "@/components/proposal-diff-viewer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlignerChat } from "@/components/aligner-chat";
import { useOptionalProject } from "@/contexts/project-context";
import { QualificationCampaignManagement } from "@/components/qualification-campaign-management";
import { toggleAllVisibleIds, toggleSelectedId, toggleTwoItemSelection } from "@/components/call-manager/kb-library-selection";
import { useKbSplitScreen } from "@/components/call-manager/use-kb-split-screen";

export function KBLibraryTab() {
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
  const { isDesktop, splitScreenMode, toggleSplitScreen } = useKbSplitScreen(() => {
    setSelectedProposal(null);
    setIsDiffDialogOpen(false);
  });

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

  const proposals = (proposalsData as any)?.proposals || [];
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
    setSelectedProposalIds((prev) => toggleSelectedId(prev, proposalId));
  };

  // Toggle all proposals (only selects visible proposals in table)
  const toggleAllProposals = () => {
    const visibleProposalIds = proposals.map((p: any) => p.id);
    setSelectedProposalIds((prev) => toggleAllVisibleIds(prev, visibleProposalIds));
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

  const versions = (versionsData as any)?.versions || [];

  // Find file for selected proposal
  const selectedFile = selectedProposal 
    ? kbFiles.find((f: any) => f.id === selectedProposal.kbFileId)
    : null;

  // Handle version selection for comparison
  const toggleVersionSelection = (versionId: string) => {
    setSelectedVersionsForDiff((prev) => toggleTwoItemSelection(prev, versionId));
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
