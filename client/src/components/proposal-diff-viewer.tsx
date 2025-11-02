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

// Word-level diff for highlighting changes within a line
function computeWordDiff(oldText: string, newText: string): { oldHighlighted: JSX.Element[]; newHighlighted: JSX.Element[] } {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);
  
  // Simple LCS for words
  const lcs: number[][] = [];
  for (let i = 0; i <= oldWords.length; i++) {
    lcs[i] = [];
    for (let j = 0; j <= newWords.length; j++) {
      if (i === 0 || j === 0) {
        lcs[i][j] = 0;
      } else if (oldWords[i - 1] === newWords[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
      }
    }
  }
  
  // Backtrack to find matching words
  const oldHighlighted: JSX.Element[] = [];
  const newHighlighted: JSX.Element[] = [];
  let i = oldWords.length;
  let j = newWords.length;
  let oldIdx = 0;
  let newIdx = 0;
  
  // Build mapping of which words are in LCS
  const oldInLCS = new Set<number>();
  const newInLCS = new Set<number>();
  
  while (i > 0 && j > 0) {
    if (oldWords[i - 1] === newWords[j - 1]) {
      oldInLCS.add(i - 1);
      newInLCS.add(j - 1);
      i--;
      j--;
    } else if (lcs[i - 1][j] > lcs[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  // Render old words with highlighting
  for (let idx = 0; idx < oldWords.length; idx++) {
    if (oldInLCS.has(idx)) {
      oldHighlighted.push(<span key={idx}>{oldWords[idx]}</span>);
    } else {
      oldHighlighted.push(
        <span key={idx} className="bg-red-200 dark:bg-red-900/40 text-red-900 dark:text-red-200">
          {oldWords[idx]}
        </span>
      );
    }
  }
  
  // Render new words with highlighting
  for (let idx = 0; idx < newWords.length; idx++) {
    if (newInLCS.has(idx)) {
      newHighlighted.push(<span key={idx}>{newWords[idx]}</span>);
    } else {
      newHighlighted.push(
        <span key={idx} className="bg-green-200 dark:bg-green-900/40 text-green-900 dark:text-green-200">
          {newWords[idx]}
        </span>
      );
    }
  }
  
  return { oldHighlighted, newHighlighted };
}

// WordPress-style unified diff (changed sections only with context)
interface DiffHunk {
  startLine: number;
  lines: Array<{
    type: 'context' | 'removed' | 'added';
    content: string;
    lineNum: number;
    wordHighlighting?: JSX.Element[];
  }>;
}

function computeUnifiedDiff(oldText: string, newText: string, contextLines = 3): DiffHunk[] {
  const oldLines = oldText === '' ? [] : oldText.split('\n');
  const newLines = newText === '' ? [] : newText.split('\n');
  
  // Build LCS table
  const lcs: number[][] = [];
  for (let i = 0; i <= oldLines.length; i++) {
    lcs[i] = [];
    for (let j = 0; j <= newLines.length; j++) {
      if (i === 0 || j === 0) {
        lcs[i][j] = 0;
      } else if (oldLines[i - 1] === newLines[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
      }
    }
  }
  
  // Backtrack to build all changes
  const changes: Array<{
    type: 'unchanged' | 'removed' | 'added';
    content: string;
    oldLineNum: number;
    newLineNum: number;
  }> = [];
  
  let i = oldLines.length;
  let j = newLines.length;
  let oldLineNum = oldLines.length;
  let newLineNum = newLines.length;
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      changes.unshift({
        type: 'unchanged',
        content: oldLines[i - 1],
        oldLineNum: oldLineNum--,
        newLineNum: newLineNum--,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      changes.unshift({
        type: 'added',
        content: newLines[j - 1],
        oldLineNum: 0,
        newLineNum: newLineNum--,
      });
      j--;
    } else if (i > 0) {
      changes.unshift({
        type: 'removed',
        content: oldLines[i - 1],
        oldLineNum: oldLineNum--,
        newLineNum: 0,
      });
      i--;
    }
  }
  
  // Group changes into hunks (sections with changes + context)
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;
  let unchangedBuffer: typeof changes = [];
  let contextAddedAfterChange = 0; // Track context lines already added after last change
  
  for (let idx = 0; idx < changes.length; idx++) {
    const change = changes[idx];
    
    if (change.type === 'unchanged') {
      if (currentHunk && contextAddedAfterChange < contextLines) {
        // Add context line after a change
        currentHunk.lines.push({
          type: 'context',
          content: change.content,
          lineNum: change.newLineNum,
        });
        contextAddedAfterChange++;
      }
      
      // Buffer unchanged lines for potential context before next change
      unchangedBuffer.push(change);
      
      // If we have enough separation, close current hunk
      if (currentHunk && unchangedBuffer.length > contextLines) {
        hunks.push(currentHunk);
        currentHunk = null;
        contextAddedAfterChange = 0;
        // Keep last contextLines in buffer for next hunk's "before" context
        unchangedBuffer = unchangedBuffer.slice(-contextLines);
      }
    } else {
      // Changed line - start or continue hunk
      if (!currentHunk) {
        // Start new hunk with context before
        const contextBefore = unchangedBuffer.slice(-contextLines);
        currentHunk = {
          startLine: contextBefore.length > 0 ? contextBefore[0].newLineNum : change.newLineNum || change.oldLineNum,
          lines: [],
        };
        
        contextBefore.forEach(c => {
          currentHunk!.lines.push({
            type: 'context',
            content: c.content,
            lineNum: c.newLineNum,
          });
        });
      }
      
      // Reset context counter and buffer when we hit a change
      unchangedBuffer = [];
      contextAddedAfterChange = 0;
      
      // Check if there's a corresponding change for word-level highlighting
      let wordHighlighting: JSX.Element[] | undefined;
      if (change.type === 'removed') {
        // Look ahead for matching added line
        const nextChange = changes[idx + 1];
        if (nextChange && nextChange.type === 'added') {
          const { oldHighlighted, newHighlighted } = computeWordDiff(change.content, nextChange.content);
          wordHighlighting = oldHighlighted;
          
          // Add removed line with word highlighting
          currentHunk.lines.push({
            type: 'removed',
            content: change.content,
            lineNum: change.oldLineNum,
            wordHighlighting,
          });
          
          // Add added line with word highlighting
          currentHunk.lines.push({
            type: 'added',
            content: nextChange.content,
            lineNum: nextChange.newLineNum,
            wordHighlighting: newHighlighted,
          });
          
          idx++; // Skip next since we handled it
          continue;
        }
      }
      
      // Regular add/remove without word highlighting
      currentHunk.lines.push({
        type: change.type as 'removed' | 'added',
        content: change.content,
        lineNum: change.type === 'removed' ? change.oldLineNum : change.newLineNum,
        wordHighlighting,
      });
    }
  }
  
  // Close final hunk if exists
  if (currentHunk) {
    hunks.push(currentHunk);
  }
  
  return hunks;
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

  // Use edited content for diff if in edit mode
  const displayContent = isEditing ? editedContent : localProposedContent;

  // Compute unified diff hunks
  const hunks = useMemo(() => {
    return computeUnifiedDiff(currentContent || '', displayContent || '');
  }, [currentContent, displayContent]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    let unchanged = 0;
    
    hunks.forEach(hunk => {
      hunk.lines.forEach(line => {
        if (line.type === 'added') added++;
        else if (line.type === 'removed') removed++;
        else unchanged++;
      });
    });
    
    return { added, removed, unchanged, total: added + removed + unchanged };
  }, [hunks]);

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

      {/* WordPress-style unified diff view */}
      {!isEditing && (
        <Card data-testid="card-diff-view">
          <CardHeader>
            <CardTitle>Changes</CardTitle>
            <CardDescription>
              Removed (red) vs. Added (green)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px] w-full rounded-md border">
              <div className="font-mono text-sm">
                {hunks.map((hunk, hunkIdx) => (
                  <div key={hunkIdx} className="mb-6">
                    {hunk.lines.map((line, lineIdx) => (
                      <div
                        key={lineIdx}
                        className={`flex ${
                          line.type === 'removed'
                            ? 'bg-red-50 dark:bg-red-950/20'
                            : line.type === 'added'
                            ? 'bg-green-50 dark:bg-green-950/20'
                            : 'bg-background'
                        }`}
                        data-testid={`diff-line-${hunkIdx}-${lineIdx}`}
                      >
                        {/* Line number */}
                        <div className="w-16 shrink-0 px-2 py-1 text-right text-muted-foreground select-none border-r">
                          {line.lineNum || ''}
                        </div>
                        
                        {/* Line content */}
                        <div className="flex-1 px-3 py-1 whitespace-pre-wrap break-words">
                          {line.type === 'removed' && (
                            <span className="text-red-600 dark:text-red-400 mr-2 select-none">−</span>
                          )}
                          {line.type === 'added' && (
                            <span className="text-green-600 dark:text-green-400 mr-2 select-none">+</span>
                          )}
                          <span className={
                            line.type === 'removed'
                              ? 'text-red-900 dark:text-red-100'
                              : line.type === 'added'
                              ? 'text-green-900 dark:text-green-100'
                              : 'text-foreground'
                          }>
                            {line.wordHighlighting || line.content}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                
                {hunks.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No changes detected
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
