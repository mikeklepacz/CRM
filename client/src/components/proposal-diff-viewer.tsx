import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, FileText, Edit2, Save, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ProposalDiffViewerProps {
  proposal: {
    id: string;
    kbFileId: string;
    rationale: string;
    status: string;
    createdAt: string;
    humanEdited?: boolean;
    originalAiContent?: string;
  };
  currentContent: string;
  proposedContent: string;
  filename: string;
  onApprove?: () => void;
  onReject?: () => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}

interface Edit {
  file: string;
  section?: string;
  old: string;
  new: string;
  reason: string;
  principle?: string;
  evidence: string;
}

export function ProposalDiffViewer({
  proposal,
  currentContent,
  proposedContent,
  filename,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: ProposalDiffViewerProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(proposedContent);
  const [localProposedContent, setLocalProposedContent] = useState(proposedContent);
  const [localHumanEdited, setLocalHumanEdited] = useState(proposal.humanEdited || false);

  // Sync local state when proposal changes
  useEffect(() => {
    setEditedContent(proposedContent);
    setLocalProposedContent(proposedContent);
    setLocalHumanEdited(proposal.humanEdited || false);
    setIsEditing(false);
  }, [proposal.id, proposedContent, proposal.humanEdited]);

  // Parse edits from JSON
  const edits = useMemo<Edit[]>(() => {
    try {
      const parsed = JSON.parse(localProposedContent);
      // Handle both array and single object
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      console.error('Failed to parse edits JSON:', error);
      return [];
    }
  }, [localProposedContent]);

  const isValidEdits = edits.length > 0 && edits.every(e => e.old && e.new && e.reason);

  // Edit proposal mutation
  const editMutation = useMutation({
    mutationFn: (content: string) => 
      apiRequest('PATCH', `/api/kb/proposals/${proposal.id}`, { proposedContent: content }),
    onSuccess: () => {
      toast({
        title: "Changes Saved",
        description: "Your edits have been saved to the proposal",
      });
      setLocalProposedContent(editedContent);
      setLocalHumanEdited(true);
      queryClient.invalidateQueries({ queryKey: ['/api/kb/proposals'] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save edits",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4" data-testid="proposal-diff-viewer">
      {/* Header */}
      <Card data-testid="card-proposal-header">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2" data-testid="text-filename">
                <FileText className="h-5 w-5" />
                {filename}
                {localHumanEdited && (
                  <Badge variant="outline" className="border-primary text-primary" data-testid="badge-human-edited">
                    Human Edited
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-2" data-testid="text-created-date">
                Created {new Date(proposal.createdAt).toLocaleString()}
              </CardDescription>
            </div>
            <Badge 
              variant={proposal.status === 'pending' ? 'default' : 'secondary'}
              data-testid="badge-status"
            >
              {proposal.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Rationale */}
          <div className="rounded-md bg-muted/50 p-4" data-testid="text-rationale">
            <p className="text-sm font-medium mb-2">Why these changes are suggested:</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{proposal.rationale}</p>
          </div>

          {/* Stats */}
          {isValidEdits && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground" data-testid="text-stats-edits">
                {edits.length} {edits.length === 1 ? 'edit' : 'edits'} proposed
              </span>
            </div>
          )}

          {/* Action buttons */}
          {proposal.status === 'pending' && onApprove && onReject && (
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    data-testid="button-edit"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit JSON
                  </Button>
                  <Button
                    onClick={onApprove}
                    disabled={isApproving || isRejecting || !isValidEdits}
                    data-testid="button-approve"
                    className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {isApproving ? 'Approving...' : 'Approve All Changes'}
                  </Button>
                  <Button
                    onClick={onReject}
                    disabled={isApproving || isRejecting}
                    variant="destructive"
                    data-testid="button-reject"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {isRejecting ? 'Rejecting...' : 'Reject'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => editMutation.mutate(editedContent)}
                    disabled={editMutation.isPending}
                    data-testid="button-save-edits"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editMutation.isPending ? 'Saving...' : 'Save Edits'}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedContent(localProposedContent);
                    }}
                    variant="outline"
                    disabled={editMutation.isPending}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit mode */}
      {isEditing && (
        <Card data-testid="card-edit-mode">
          <CardHeader>
            <CardTitle>Edit Proposed Changes (JSON)</CardTitle>
            <CardDescription>
              Make changes to the AI-generated edits. Must be valid JSON array.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="font-mono text-sm min-h-[600px]"
              data-testid="textarea-edit-content"
            />
          </CardContent>
        </Card>
      )}

      {/* Individual edits view */}
      {!isEditing && (
        <>
          {!isValidEdits ? (
            <Card data-testid="card-error">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 text-destructive">
                  <AlertCircle className="h-6 w-6" />
                  <div>
                    <p className="font-medium">Invalid edit format</p>
                    <p className="text-sm text-muted-foreground">
                      The proposal content is not in the expected JSON format. Please edit or reject.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {edits.map((edit, idx) => (
                <Card key={idx} data-testid={`card-edit-${idx}`}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Edit {idx + 1}
                      {edit.section && (
                        <Badge variant="outline" data-testid={`badge-section-${idx}`}>
                          {edit.section}
                        </Badge>
                      )}
                    </CardTitle>
                    {edit.principle && (
                      <CardDescription data-testid={`text-principle-${idx}`}>
                        Principle: {edit.principle}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Reason */}
                    <div className="rounded-md bg-muted/50 p-3" data-testid={`text-reason-${idx}`}>
                      <p className="text-sm font-medium mb-1">Reason:</p>
                      <p className="text-sm text-muted-foreground">{edit.reason}</p>
                    </div>

                    {/* Evidence */}
                    <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3" data-testid={`text-evidence-${idx}`}>
                      <p className="text-sm font-medium mb-1 text-blue-900 dark:text-blue-100">Evidence:</p>
                      <p className="text-sm text-blue-800 dark:text-blue-200 italic">{edit.evidence}</p>
                    </div>

                    {/* Before/After comparison */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Before */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-1 w-1 rounded-full bg-red-500"></div>
                          <p className="text-sm font-medium text-red-900 dark:text-red-100">Before</p>
                        </div>
                        <div className="rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-3" data-testid={`text-before-${idx}`}>
                          <p className="text-sm text-red-900 dark:text-red-100 whitespace-pre-wrap font-mono">{edit.old}</p>
                        </div>
                      </div>

                      {/* After */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-1 w-1 rounded-full bg-green-500"></div>
                          <p className="text-sm font-medium text-green-900 dark:text-green-100">After</p>
                        </div>
                        <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-3" data-testid={`text-after-${idx}`}>
                          <p className="text-sm text-green-900 dark:text-green-100 whitespace-pre-wrap font-mono">{edit.new}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
