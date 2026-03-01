import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ProposalHeaderCard } from "./proposal-diff-viewer/header-card";
import { InvalidFormatCard } from "./proposal-diff-viewer/invalid-format-card";
import { ProposalEditsList } from "./proposal-diff-viewer/edits-list";
import { parseEdits, isValidEdits as validateEdits } from "./proposal-diff-viewer/helpers";
import { Edit, Proposal } from "./proposal-diff-viewer/types";

interface ProposalDiffViewerProps {
  proposal: Proposal;
  currentContent: string;
  proposedContent: string;
  filename: string;
  onApprove?: () => void;
  onReject?: () => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}

export function ProposalDiffViewer({
  proposal,
  currentContent: _currentContent,
  proposedContent,
  filename,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: ProposalDiffViewerProps) {
  const { toast } = useToast();
  const [editedContent, setEditedContent] = useState(proposedContent);
  const [localProposedContent, setLocalProposedContent] = useState(proposedContent);
  const [localHumanEdited, setLocalHumanEdited] = useState(proposal.humanEdited || false);
  const [selectedEdits, setSelectedEdits] = useState<Set<number>>(new Set());
  const [inlineEdits, setInlineEdits] = useState<Map<number, string>>(new Map());
  const [failedEdits, setFailedEdits] = useState<Set<number>>(new Set());
  const [isLocallyProcessing, setIsLocallyProcessing] = useState(false);

  useEffect(() => {
    setEditedContent(proposedContent);
    setLocalProposedContent(proposedContent);
    setLocalHumanEdited(proposal.humanEdited || false);
    setInlineEdits(new Map());
    setFailedEdits(new Set());
  }, [proposal.id, proposedContent, proposal.humanEdited]);

  useEffect(() => {
    if (!isApproving && !isRejecting) {
      setIsLocallyProcessing(false);
    }
  }, [isApproving, isRejecting]);

  const edits = useMemo<Edit[]>(() => parseEdits(localProposedContent), [localProposedContent]);
  const isValidEdits = validateEdits(edits);

  useEffect(() => {
    if (edits.length > 0) {
      setSelectedEdits(new Set(edits.map((_, idx) => idx)));
    }
  }, [edits.length]);

  const toggleEditSelection = (index: number) => {
    const newSelected = new Set(selectedEdits);
    if (newSelected.has(index)) newSelected.delete(index);
    else newSelected.add(index);
    setSelectedEdits(newSelected);
  };

  const handleInlineEdit = (index: number, newValue: string) => {
    const newInlineEdits = new Map(inlineEdits);
    if (newValue === edits[index]?.new) newInlineEdits.delete(index);
    else newInlineEdits.set(index, newValue);
    setInlineEdits(newInlineEdits);
  };

  const getNewText = (index: number): string => inlineEdits.get(index) ?? edits[index]?.new ?? "";

  const approveMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/kb/proposals/${proposal.id}/approve`),
    onSuccess: (data: any) => {
      if (data.syncState === "local_only") {
        toast({
          title: "Proposal Approved (Local)",
          description: `Version ${data.version.versionNumber} created and backed up to Google Drive. This file is local-only and not synced to ElevenLabs agents.`,
        });
      } else if (data.elevenlabsSynced) {
        const agentsUpdated = data.agentsUpdated || 0;
        const agentText = agentsUpdated > 0 ? ` (${agentsUpdated} agent${agentsUpdated !== 1 ? "s" : ""} updated)` : "";
        toast({ title: "Proposal Approved & Synced", description: `Version ${data.version.versionNumber} created and synced to ElevenLabs${agentText}` });
      } else if (data.syncError) {
        toast({
          title: "Approved (Sync Failed)",
          description: `Version ${data.version.versionNumber} created and backed up, but ElevenLabs sync failed: ${data.syncError}`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Proposal Approved", description: `Version ${data.version.versionNumber} created` });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/kb/proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kb/files"] });
      setIsLocallyProcessing(false);
      onApprove?.();
    },
    onError: (error: any) => {
      setIsLocallyProcessing(false);
      if (error.failedEdits && Array.isArray(error.failedEdits)) {
        const failedIndices = new Set<number>(error.failedEdits.map((f: any) => f.editNumber - 1));
        setFailedEdits(failedIndices);
        const newSelected = new Set(selectedEdits);
        failedIndices.forEach((idx) => newSelected.delete(idx));
        setSelectedEdits(newSelected);
        const successCount = error.totalEdits - error.failedCount;
        const remainingCount = newSelected.size;
        toast({
          title: "Some Edits Could Not Be Applied",
          description: `${error.failedCount} edit(s) failed because the original text has changed. ${successCount > 0 ? `${successCount} edit(s) were applied successfully. ` : ""}${remainingCount > 0 ? `${remainingCount} edit(s) remain selected and ready to approve.` : "Please review the failed edits marked in red."}`,
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({ title: "Approval Failed", description: error.message || error.error || "Failed to approve proposal", variant: "destructive" });
      }
    },
  });

  const editMutation = useMutation({
    mutationFn: (params: { content: string; savedIndices?: number[] }) =>
      apiRequest("PATCH", `/api/kb/proposals/${proposal.id}`, { proposedContent: params.content }),
    onSuccess: (_data, variables) => {
      toast({ title: "Changes Saved", description: "Your edits have been saved to the proposal" });
      setLocalProposedContent(editedContent);
      setLocalHumanEdited(true);
      if (variables.savedIndices) {
        const newInlineEdits = new Map(inlineEdits);
        variables.savedIndices.forEach((idx) => newInlineEdits.delete(idx));
        setInlineEdits(newInlineEdits);
      } else {
        setInlineEdits(new Map());
      }
      queryClient.invalidateQueries({ queryKey: ["/api/kb/proposals"] });
    },
    onError: (error: any) => {
      toast({ title: "Save Failed", description: error.message || "Failed to save edits", variant: "destructive" });
    },
  });

  const saveInlineEdits = () => {
    if (inlineEdits.size === 0) return;
    const updatedEdits = edits.map((edit, idx) => (inlineEdits.has(idx) ? { ...edit, new: inlineEdits.get(idx)! } : edit));
    const jsonContent = JSON.stringify(updatedEdits, null, 2);
    setEditedContent(jsonContent);
    editMutation.mutate({ content: jsonContent, savedIndices: Array.from(inlineEdits.keys()) });
  };

  const handleApproveSelected = async (editsToApprove?: Set<number>) => {
    if (isLocallyProcessing) return;
    setIsLocallyProcessing(true);

    const editsSet = editsToApprove || selectedEdits;
    if (!(editsSet instanceof Set)) {
      toast({ title: "Selection Error", description: "Invalid edit selection state. Please refresh and try again.", variant: "destructive" });
      setIsLocallyProcessing(false);
      return;
    }
    if (editsSet.size === 0) {
      toast({ title: "No Edits Selected", description: "Please select at least one edit to approve", variant: "destructive" });
      setIsLocallyProcessing(false);
      return;
    }

    if (inlineEdits.size > 0) {
      const updatedEdits = edits.map((edit, idx) => (inlineEdits.has(idx) ? { ...edit, new: inlineEdits.get(idx)! } : edit));
      const fullJson = JSON.stringify(updatedEdits, null, 2);
      try {
        await apiRequest("PATCH", `/api/kb/proposals/${proposal.id}`, { proposedContent: fullJson });
        setLocalProposedContent(fullJson);
        setLocalHumanEdited(true);
        setInlineEdits(new Map());
        queryClient.invalidateQueries({ queryKey: ["/api/kb/proposals"] });
        toast({ title: "Changes Saved", description: "Your edits have been saved" });
      } catch (_error) {
        toast({ title: "Save Failed", description: "Failed to save inline edits before approval", variant: "destructive" });
        setIsLocallyProcessing(false);
        return;
      }
    }

    if (editsSet.size === edits.length) {
      approveMutation.mutate();
    } else {
      const selectedEditsArray = edits.filter((_, idx) => editsSet.has(idx));
      const filteredJson = JSON.stringify(selectedEditsArray, null, 2);
      setEditedContent(filteredJson);
      editMutation.mutate(
        { content: filteredJson, savedIndices: Array.from(editsSet) },
        {
          onSuccess: () => approveMutation.mutate(),
          onError: () => setIsLocallyProcessing(false),
        }
      );
    }
  };

  return (
    <div className="space-y-4" data-testid="proposal-diff-viewer">
      <ProposalHeaderCard
        proposal={proposal}
        filename={filename}
        localHumanEdited={localHumanEdited}
        isValidEdits={isValidEdits}
        edits={edits}
        selectedCount={selectedEdits.size}
        inlineEditsSize={inlineEdits.size}
        isLocallyProcessing={isLocallyProcessing}
        isRejecting={isRejecting}
        editPending={editMutation.isPending}
        approvePending={approveMutation.isPending}
        onSaveInline={saveInlineEdits}
        onApproveSelected={() => handleApproveSelected()}
        onReject={() => {
          if (isLocallyProcessing) return;
          setIsLocallyProcessing(true);
          onReject?.();
        }}
      />

      {!isValidEdits ? (
        <InvalidFormatCard />
      ) : (
        <ProposalEditsList
          edits={edits}
          selectedEdits={selectedEdits}
          failedEdits={failedEdits}
          isPendingStatus={proposal.status === "pending"}
          isLocallyProcessing={isLocallyProcessing}
          approvePending={approveMutation.isPending}
          isRejecting={isRejecting}
          inlineEdits={inlineEdits}
          getNewText={getNewText}
          onToggleSelected={toggleEditSelection}
          onInlineEdit={handleInlineEdit}
          onApproveSingle={(idx) => handleApproveSelected(new Set([idx]))}
          onSkipSingle={(idx) => {
            const newSelected = new Set(selectedEdits);
            newSelected.delete(idx);
            setSelectedEdits(newSelected);
          }}
        />
      )}
    </div>
  );
}
