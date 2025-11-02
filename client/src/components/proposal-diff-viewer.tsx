import React, { useMemo, useState, useEffect } from 'react';
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

// Word-level diff for highlighting specific changed words within a line
function computeWordDiff(oldText: string, newText: string): { 
  oldWords: Array<{ text: string; changed: boolean }>;
  newWords: Array<{ text: string; changed: boolean }>;
} {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);
  
  // Build LCS table for words
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
  
  // Backtrack to find which words are in LCS (unchanged)
  const oldInLCS = new Set<number>();
  const newInLCS = new Set<number>();
  let i = oldWords.length;
  let j = newWords.length;
  
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
  
  // Build result arrays marking changed vs unchanged words
  const oldResult = oldWords.map((word, idx) => ({
    text: word,
    changed: !oldInLCS.has(idx)
  }));
  
  const newResult = newWords.map((word, idx) => ({
    text: word,
    changed: !newInLCS.has(idx)
  }));
  
  return { oldWords: oldResult, newWords: newResult };
}

// Unified diff format (like Git) - shows only changed sections with context
interface DiffLine {
  type: 'context' | 'removed' | 'added';
  content: string;
  oldLineNum: number | null;
  newLineNum: number | null;
}

interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
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
  
  // Backtrack to build diff
  const allChanges: DiffLine[] = [];
  let i = oldLines.length;
  let j = newLines.length;
  let oldLineNum = oldLines.length;
  let newLineNum = newLines.length;
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      // Unchanged line
      allChanges.unshift({
        type: 'context',
        content: oldLines[i - 1],
        oldLineNum: oldLineNum--,
        newLineNum: newLineNum--,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      // Line added
      allChanges.unshift({
        type: 'added',
        content: newLines[j - 1],
        oldLineNum: null,
        newLineNum: newLineNum--,
      });
      j--;
    } else if (i > 0) {
      // Line removed
      allChanges.unshift({
        type: 'removed',
        content: oldLines[i - 1],
        oldLineNum: oldLineNum--,
        newLineNum: null,
      });
      i--;
    }
  }
  
  // Group into hunks (changed sections with context)
  const hunks: DiffHunk[] = [];
  let currentHunk: { lines: DiffLine[] } | null = null;
  let unchangedBuffer: DiffLine[] = [];
  let contextAddedAfter = 0;
  
  for (const line of allChanges) {
    if (line.type === 'context') {
      if (currentHunk && contextAddedAfter < contextLines) {
        // Add context after change
        currentHunk.lines.push(line);
        contextAddedAfter++;
      }
      
      unchangedBuffer.push(line);
      
      // Close hunk if we have enough separation
      if (currentHunk && unchangedBuffer.length > contextLines) {
        // Calculate hunk header info
        const firstLine = currentHunk.lines[0];
        const lastLine = currentHunk.lines[currentHunk.lines.length - 1];
        const oldStart = firstLine.oldLineNum || 1;
        const newStart = firstLine.newLineNum || 1;
        const oldCount = currentHunk.lines.filter(l => l.oldLineNum !== null).length;
        const newCount = currentHunk.lines.filter(l => l.newLineNum !== null).length;
        
        hunks.push({
          oldStart,
          oldLines: oldCount,
          newStart,
          newLines: newCount,
          lines: currentHunk.lines,
        });
        
        currentHunk = null;
        contextAddedAfter = 0;
        unchangedBuffer = unchangedBuffer.slice(-contextLines);
      }
    } else {
      // Changed line - start or continue hunk
      if (!currentHunk) {
        const contextBefore = unchangedBuffer.slice(-contextLines);
        currentHunk = {
          lines: [...contextBefore],
        };
      }
      
      unchangedBuffer = [];
      contextAddedAfter = 0;
      currentHunk.lines.push(line);
    }
  }
  
  // Close final hunk
  if (currentHunk) {
    const firstLine = currentHunk.lines[0];
    const lastLine = currentHunk.lines[currentHunk.lines.length - 1];
    const oldStart = firstLine.oldLineNum || 1;
    const newStart = firstLine.newLineNum || 1;
    const oldCount = currentHunk.lines.filter(l => l.oldLineNum !== null).length;
    const newCount = currentHunk.lines.filter(l => l.newLineNum !== null).length;
    
    hunks.push({
      oldStart,
      oldLines: oldCount,
      newStart,
      newLines: newCount,
      lines: currentHunk.lines,
    });
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

  const displayContent = isEditing ? editedContent : localProposedContent;

  // Compute unified diff with hunks
  const hunks = useMemo(() => {
    return computeUnifiedDiff(currentContent || '', displayContent || '');
  }, [currentContent, displayContent]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    let context = 0;
    
    hunks.forEach(hunk => {
      hunk.lines.forEach(line => {
        if (line.type === 'added') added++;
        else if (line.type === 'removed') removed++;
        else context++;
      });
    });
    
    return { added, removed, context, total: added + removed + context };
  }, [hunks]);

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
            <p className="text-sm font-medium mb-2">Why this change is suggested:</p>
            <p className="text-sm text-muted-foreground">{proposal.rationale}</p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-600 dark:text-green-400" data-testid="text-stats-added">
              +{stats.added} added
            </span>
            <span className="text-red-600 dark:text-red-400" data-testid="text-stats-removed">
              -{stats.removed} removed
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

      {/* Edit mode */}
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

      {/* Unified diff view (like Git) */}
      {!isEditing && (
        <Card data-testid="card-diff-view">
          <CardHeader>
            <CardTitle>Changes</CardTitle>
            <CardDescription>
              Only changed sections are shown with context. Red = removed, Green = added.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px] w-full rounded-md border">
              <div className="font-mono text-sm">
                {hunks.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No changes detected
                  </div>
                ) : (
                  hunks.map((hunk, hunkIdx) => (
                    <div key={hunkIdx} className="border-b last:border-b-0">
                      {/* Hunk header - shows line range */}
                      <div className="bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground border-b sticky top-0 z-10">
                        @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                      </div>
                      
                      {/* Hunk lines */}
                      {hunk.lines.map((line, lineIdx) => (
                        <div
                          key={lineIdx}
                          className={`flex ${
                            line.type === 'removed' 
                              ? 'bg-red-50 dark:bg-red-950/20' 
                              : line.type === 'added'
                              ? 'bg-green-50 dark:bg-green-950/20'
                              : ''
                          }`}
                          data-testid={`diff-line-${hunkIdx}-${lineIdx}`}
                        >
                          {/* Line numbers */}
                          <div className="flex-shrink-0 px-2 py-1 text-right text-xs text-muted-foreground bg-muted/10 select-none">
                            <span className="inline-block w-12">{line.oldLineNum || ''}</span>
                            <span className="inline-block w-12 ml-1">{line.newLineNum || ''}</span>
                          </div>
                          
                          {/* Line content with prefix */}
                          <div className="flex-1 px-3 py-1 whitespace-pre-wrap break-words">
                            {line.type === 'removed' && (
                              <>
                                <span className="text-red-600 dark:text-red-400 mr-2 select-none">−</span>
                                <span className="text-red-900 dark:text-red-100">{line.content}</span>
                              </>
                            )}
                            {line.type === 'added' && (
                              <>
                                <span className="text-green-600 dark:text-green-400 mr-2 select-none">+</span>
                                <span className="text-green-900 dark:text-green-100">{line.content}</span>
                              </>
                            )}
                            {line.type === 'context' && (
                              <>
                                <span className="text-muted-foreground mr-2 select-none"> </span>
                                <span className="text-foreground">{line.content}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
