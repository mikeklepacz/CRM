import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useOptionalProject } from "@/contexts/project-context";
import { toggleAllVisibleIds, toggleSelectedId, toggleTwoItemSelection } from "@/components/call-manager/kb-library-selection";
import { useKbSplitScreen } from "@/components/call-manager/use-kb-split-screen";
import { KBLibrarySplitScreenView } from "@/components/call-manager/kb-library-split-screen-view";
import { KBLibraryMainView } from "@/components/call-manager/kb-library-main-view";
import { KBLibraryDialogs } from "@/components/call-manager/kb-library-dialogs";
import { useKbLibraryData } from "@/components/call-manager/use-kb-library-data";
import { queryClient } from "@/lib/queryClient";

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

  const {
    kbData,
    kbLoading,
    proposalsData,
    proposalsLoading,
    versionsData,
    syncMutation,
    uploadMutation,
    approveMutation,
    rejectMutation,
    deleteProposalsMutation,
    rollbackMutation,
  } = useKbLibraryData({
    currentProject,
    toast,
    setUploadProgress,
    setIsDiffDialogOpen,
    setSelectedProposal,
    setSelectedProposalIds,
    selectedFileId,
    isVersionDialogOpen,
  });

  const kbFiles = kbData?.files || [];
  const proposals = (proposalsData as any)?.proposals || [];
  const pendingProposals = proposals.filter((p: any) => p.status === "pending");

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

  if (splitScreenMode) {
    return (
      <KBLibrarySplitScreenView
        splitScreenMode={splitScreenMode}
        toggleSplitScreen={toggleSplitScreen}
        handleFileSelect={handleFileSelect}
        uploadMutation={uploadMutation}
        syncMutation={syncMutation}
        selectedProposal={selectedProposal}
        selectedFile={selectedFile}
        approveMutation={approveMutation}
        rejectMutation={rejectMutation}
        proposalsLoading={proposalsLoading}
        pendingProposals={pendingProposals}
        kbFiles={kbFiles}
        setSelectedProposal={setSelectedProposal}
      />
    );
  }

  return (
    <>
      <KBLibraryMainView
        kbFiles={kbFiles}
        pendingProposals={pendingProposals}
        kbLoading={kbLoading}
        isDesktop={isDesktop}
        splitScreenMode={splitScreenMode}
        toggleSplitScreen={toggleSplitScreen}
        proposalsLoading={proposalsLoading}
        proposals={proposals}
        selectedProposalIds={selectedProposalIds}
        handleDeleteSelected={handleDeleteSelected}
        deleteProposalsMutation={deleteProposalsMutation}
        toggleAllProposals={toggleAllProposals}
        toggleProposalSelection={toggleProposalSelection}
        setSelectedProposal={setSelectedProposal}
        setIsDiffDialogOpen={setIsDiffDialogOpen}
        setSelectedFileId={setSelectedFileId}
        setIsVersionDialogOpen={setIsVersionDialogOpen}
        handleFileSelect={handleFileSelect}
        uploadMutation={uploadMutation}
        syncMutation={syncMutation}
      />
      <KBLibraryDialogs
        isVersionDialogOpen={isVersionDialogOpen}
        setIsVersionDialogOpen={setIsVersionDialogOpen}
        selectedVersionsForDiff={selectedVersionsForDiff}
        setSelectedVersionsForDiff={setSelectedVersionsForDiff}
        openVersionDiff={openVersionDiff}
        versions={versions}
        toggleVersionSelection={toggleVersionSelection}
        rollbackMutation={rollbackMutation}
        selectedFileId={selectedFileId}
        viewVersionContent={viewVersionContent}
        loadVersionToEditor={loadVersionToEditor}
        splitScreenMode={splitScreenMode}
        isDiffDialogOpen={isDiffDialogOpen}
        setIsDiffDialogOpen={setIsDiffDialogOpen}
        selectedProposal={selectedProposal}
        selectedFile={selectedFile}
        approveMutation={approveMutation}
        rejectMutation={rejectMutation}
        isVersionViewerOpen={isVersionViewerOpen}
        setIsVersionViewerOpen={setIsVersionViewerOpen}
        viewingVersion={viewingVersion}
        isVersionDiffDialogOpen={isVersionDiffDialogOpen}
        setIsVersionDiffDialogOpen={setIsVersionDiffDialogOpen}
        version1={version1}
        version2={version2}
        kbFiles={kbFiles}
      />
    </>
  );
}
