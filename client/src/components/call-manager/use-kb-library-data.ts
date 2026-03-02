import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface UseKbLibraryDataParams {
  currentProject: any;
  toast: any;
  setUploadProgress: (value: { current: number; total: number } | null) => void;
  setIsDiffDialogOpen: (open: boolean) => void;
  setSelectedProposal: (proposal: any | null) => void;
  setSelectedProposalIds: (ids: string[]) => void;
  selectedFileId: string | null;
  isVersionDialogOpen: boolean;
}

export function useKbLibraryData({
  currentProject,
  toast,
  setUploadProgress,
  setIsDiffDialogOpen,
  setSelectedProposal,
  setSelectedProposalIds,
  selectedFileId,
  isVersionDialogOpen,
}: UseKbLibraryDataParams) {
  const { data: kbData, isLoading: kbLoading } = useQuery({
    queryKey: ["/api/kb/files", currentProject?.id],
    queryFn: async () => {
      const url = new URL("/api/kb/files", window.location.origin);
      if (currentProject?.id) {
        url.searchParams.set("projectId", currentProject.id);
      }
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch KB files");
      return response.json();
    },
  });

  const { data: proposalsData, isLoading: proposalsLoading } = useQuery({
    queryKey: ["/api/kb/proposals"],
  });

  const { data: versionsData } = useQuery({
    queryKey: ["/api/kb/files", selectedFileId, "versions"],
    enabled: !!selectedFileId && isVersionDialogOpen,
  });

  const syncMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/kb/sync"),
    onSuccess: (data: any) => {
      const parts = [];
      if (data.pushedCount > 0) parts.push(`Pushed ${data.pushedCount} to ElevenLabs`);
      if (data.pulledCount > 0) parts.push(`Pulled ${data.pulledCount} from ElevenLabs`);
      if (data.createdLocal > 0) parts.push(`${data.createdLocal} new local`);
      if (data.createdRemote > 0) parts.push(`${data.createdRemote} new remote`);
      if (data.skipped > 0) parts.push(`${data.skipped} unchanged`);

      const description = parts.length > 0 ? parts.join(", ") : "All files in sync";

      toast({
        title: "Sync Complete",
        description,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/kb/files"] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync with ElevenLabs",
        variant: "destructive",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      console.log("[KB Upload] Preparing to upload", files.length, "files");
      const formData = new FormData();
      files.forEach((file, idx) => {
        console.log(`[KB Upload] Adding file ${idx + 1}:`, file.name, file.size, "bytes");
        formData.append("files", file);
      });
      if (currentProject?.id) {
        formData.append("projectId", currentProject.id);
      }

      console.log("[KB Upload] Sending request...");
      const response = await fetch("/api/kb/upload-batch", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      console.log("[KB Upload] Response status:", response.status);
      if (!response.ok) {
        const error = await response.json();
        console.error("[KB Upload] Error:", error);
        throw new Error(error.error || "Upload failed");
      }

      const result = await response.json();
      console.log("[KB Upload] Success:", result);
      return result;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Upload Complete",
        description: `Imported ${data.imported} new files, updated ${data.updated} existing files. ${data.skipped} skipped.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/kb/files"] });
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

  const approveMutation = useMutation({
    mutationFn: (proposalId: string) => apiRequest("POST", `/api/kb/proposals/${proposalId}/approve`),
    onSuccess: (data: any) => {
      if (data.elevenlabsSynced) {
        const agentsUpdated = data.agentsUpdated || 0;
        const agentText = agentsUpdated > 0 ? ` (${agentsUpdated} agent${agentsUpdated !== 1 ? "s" : ""} updated)` : "";

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
      queryClient.invalidateQueries({ queryKey: ["/api/kb/proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kb/files"] });
      setIsDiffDialogOpen(false);
      setSelectedProposal(null);
    },
    onError: (error: any) => {
      if (error.failedEdits && Array.isArray(error.failedEdits)) {
        const failureDetails = error.failedEdits.map((f: any) => `• Edit ${f.editNumber}: ${f.reason}`).join("\n");

        toast({
          title: `${error.failedCount} of ${error.totalEdits} Edits Failed`,
          description: failureDetails.substring(0, 300) + (failureDetails.length > 300 ? "..." : ""),
          variant: "destructive",
          duration: 10000,
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

  const rejectMutation = useMutation({
    mutationFn: (proposalId: string) => apiRequest("POST", `/api/kb/proposals/${proposalId}/reject`),
    onSuccess: () => {
      toast({
        title: "Proposal Rejected",
        description: "Proposal has been rejected",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/kb/proposals"] });
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

  const deleteProposalsMutation = useMutation({
    mutationFn: async (proposalIds: string[]) => {
      const results = await Promise.all(proposalIds.map((id) => apiRequest("DELETE", `/api/kb/proposals/${id}`)));
      return results;
    },
    onSuccess: (_, proposalIds) => {
      toast({
        title: "Proposals Deleted",
        description: `Successfully deleted ${proposalIds.length} proposal(s)`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/kb/proposals"] });
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

  const rollbackMutation = useMutation({
    mutationFn: ({ fileId, versionId }: { fileId: string; versionId: string }) =>
      apiRequest("POST", `/api/kb/files/${fileId}/rollback`, { versionId }),
    onSuccess: () => {
      toast({
        title: "Rollback Complete",
        description: "File has been rolled back to selected version",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/kb/files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kb/files", selectedFileId, "versions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Rollback Failed",
        description: error.message || "Failed to rollback file",
        variant: "destructive",
      });
    },
  });

  return {
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
  };
}
