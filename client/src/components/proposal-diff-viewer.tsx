import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, FileText, Edit2, Save } from 'lucide-react';
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

// Simple custom diff implementation
function computeLineDiff(oldText: string, newText: string) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  
  const result: Array<{
    type: 'unchanged' | 'added' | 'removed';
    content: string;
    oldLineNum?: number;
    newLineNum?: number;
  }> = [];
  
  let oldIdx = 0;
  let newIdx = 0;
  let oldLineNum = 1;
  let newLineNum = 1;

  // Simple LCS-based diff
  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (oldIdx >= oldLines.length) {
      // Remaining new lines are additions
      result.push({
        type: 'added',
        content: newLines[newIdx],
        newLineNum: newLineNum++,
      });
      newIdx++;
    } else if (newIdx >= newLines.length) {
      // Remaining old lines are deletions
      result.push({
        type: 'removed',
        content: oldLines[oldIdx],
        oldLineNum: oldLineNum++,
      });
      oldIdx++;
    } else if (oldLines[oldIdx] === newLines[newIdx]) {
      // Lines match - unchanged
      result.push({
        type: 'unchanged',
        content: oldLines[oldIdx],
        oldLineNum: oldLineNum++,
        newLineNum: newLineNum++,
      });
      oldIdx++;
      newIdx++;
    } else {
      // Lines differ - check if next line in new matches current old (deletion)
      // or next line in old matches current new (addition)
      const nextNewMatchesOld = newIdx + 1 < newLines.length && newLines[newIdx + 1] === oldLines[oldIdx];
      const nextOldMatchesNew = oldIdx + 1 < oldLines.length && oldLines[oldIdx + 1] === newLines[newIdx];
      
      if (nextOldMatchesNew && !nextNewMatchesOld) {
        // Current old line was removed
        result.push({
          type: 'removed',
          content: oldLines[oldIdx],
          oldLineNum: oldLineNum++,
        });
        oldIdx++;
      } else if (nextNewMatchesOld && !nextOldMatchesNew) {
        // Current new line was added
        result.push({
          type: 'added',
          content: newLines[newIdx],
          newLineNum: newLineNum++,
        });
        newIdx++;
      } else {
        // Lines are different but no clear pattern - show as removal + addition
        result.push({
          type: 'removed',
          content: oldLines[oldIdx],
          oldLineNum: oldLineNum++,
        });
        result.push({
          type: 'added',
          content: newLines[newIdx],
          newLineNum: newLineNum++,
        });
        oldIdx++;
        newIdx++;
      }
    }
  }
  
  return result;
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

  // Sync local state when proposal changes (switching between proposals)
  useEffect(() => {
    setEditedContent(proposedContent);
    setLocalProposedContent(proposedContent);
    setLocalHumanEdited(proposal.humanEdited || false);
    setIsEditing(false);
  }, [proposal.id, proposedContent, proposal.humanEdited]);

  // Edit proposal mutation
  const editMutation = useMutation({
    mutationFn: (content: string) => 
      apiRequest('PATCH', `/api/kb/proposals/${proposal.id}`, { proposedContent: content }),
    onSuccess: () => {
      toast({
        title: "Changes Saved",
        description: "Your edits have been saved to the proposal",
      });
      // Update local state immediately so diff reflects changes
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

  // Use edited content for diff if in edit mode, otherwise use local state
  const displayContent = isEditing ? editedContent : localProposedContent;

  // Compute line-by-line diff using custom implementation
  const diffLines = useMemo(() => {
    return computeLineDiff(currentContent || '', displayContent || '');
  }, [currentContent, displayContent]);

  const stats = useMemo(() => {
    const added = diffLines.filter(l => l.type === 'added').length;
    const removed = diffLines.filter(l => l.type === 'removed').length;
    const unchanged = diffLines.filter(l => l.type === 'unchanged').length;
    return { added, removed, unchanged, total: added + removed + unchanged };
  }, [diffLines]);

  return (
    <div className="space-y-4" data-testid="proposal-diff-viewer">
      {/* Header with rationale and actions */}
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
            <p className="text-sm font-medium mb-2">Why this change is suggested:</p>
            <p className="text-sm text-muted-foreground">{proposal.rationale}</p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground" data-testid="text-stats-total">
              {stats.total} lines
            </span>
            <span className="text-green-600 dark:text-green-400" data-testid="text-stats-added">
              +{stats.added} added
            </span>
            <span className="text-red-600 dark:text-red-400" data-testid="text-stats-removed">
              -{stats.removed} removed
            </span>
            <span className="text-muted-foreground" data-testid="text-stats-unchanged">
              {stats.unchanged} unchanged
            </span>
          </div>

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
                    Edit Proposal
                  </Button>
                  <Button
                    onClick={onApprove}
                    disabled={isApproving || isRejecting}
                    data-testid="button-approve"
                    className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {isApproving ? 'Approving...' : 'Approve Changes'}
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

      {/* Edit mode - full content editor */}
      {isEditing && (
        <Card data-testid="card-edit-mode">
          <CardHeader>
            <CardTitle>Edit Proposed Content</CardTitle>
            <CardDescription>
              Make changes to the AI-generated proposal before approving
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

      {/* Side-by-side diff view */}
      {!isEditing && (
        <Card data-testid="card-diff-view">
          <CardHeader>
            <CardTitle>Changes</CardTitle>
            <CardDescription>
              Current version (left) vs. Proposed changes (right)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] w-full rounded-md border">
            <div className="font-mono text-xs">
              {diffLines.map((line, idx) => (
                <div
                  key={idx}
                  className={`flex border-b hover:bg-accent/5 ${
                    line.type === 'added'
                      ? 'bg-green-50 dark:bg-green-950/20'
                      : line.type === 'removed'
                      ? 'bg-red-50 dark:bg-red-950/20'
                      : ''
                  }`}
                  data-testid={`diff-line-${idx}`}
                >
                  {/* Line numbers and content */}
                  <div className="grid grid-cols-2 w-full">
                    {/* Left side (old content) */}
                    <div className="flex border-r">
                      {line.type !== 'added' && (
                        <>
                          <div className="w-12 shrink-0 bg-muted/30 px-2 py-1 text-right text-muted-foreground select-none">
                            {line.oldLineNum}
                          </div>
                          <div className={`flex-1 px-2 py-1 ${
                            line.type === 'removed' ? 'bg-red-100 dark:bg-red-900/10' : ''
                          }`}>
                            {line.type === 'removed' && <span className="text-red-600 dark:text-red-400 mr-1">-</span>}
                            <span className={line.type === 'removed' ? 'text-red-900 dark:text-red-300' : ''}>
                              {line.content || '\u00A0'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Right side (new content) */}
                    <div className="flex">
                      {line.type !== 'removed' && (
                        <>
                          <div className="w-12 shrink-0 bg-muted/30 px-2 py-1 text-right text-muted-foreground select-none">
                            {line.newLineNum}
                          </div>
                          <div className={`flex-1 px-2 py-1 ${
                            line.type === 'added' ? 'bg-green-100 dark:bg-green-900/10' : ''
                          }`}>
                            {line.type === 'added' && <span className="text-green-600 dark:text-green-400 mr-1">+</span>}
                            <span className={line.type === 'added' ? 'text-green-900 dark:text-green-300' : ''}>
                              {line.content || '\u00A0'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
