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

// WordPress-style side-by-side diff with hunks (changed sections only)
interface DiffLine {
  type: 'unchanged' | 'removed' | 'added' | 'modified';
  oldContent: string | null;
  newContent: string | null;
  oldLineNum: number | null;
  newLineNum: number | null;
  oldWordDiff?: Array<{ text: string; changed: boolean }>;
  newWordDiff?: Array<{ text: string; changed: boolean }>;
}

interface DiffHunk {
  startLine: number;
  lines: DiffLine[];
}

function computeSideBySideDiff(oldText: string, newText: string, contextLines = 3): DiffHunk[] {
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
        type: 'unchanged',
        oldContent: oldLines[i - 1],
        newContent: newLines[j - 1],
        oldLineNum: oldLineNum--,
        newLineNum: newLineNum--,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      // Line added
      allChanges.unshift({
        type: 'added',
        oldContent: null,
        newContent: newLines[j - 1],
        oldLineNum: null,
        newLineNum: newLineNum--,
      });
      j--;
    } else if (i > 0) {
      // Line removed
      allChanges.unshift({
        type: 'removed',
        oldContent: oldLines[i - 1],
        newContent: null,
        oldLineNum: oldLineNum--,
        newLineNum: null,
      });
      i--;
    }
  }
  
  // Detect modifications (removed + added pair) and add word-level diffs
  for (let idx = 0; idx < allChanges.length - 1; idx++) {
    const current = allChanges[idx];
    const next = allChanges[idx + 1];
    
    if (current.type === 'removed' && next.type === 'added') {
      // This is a modification - add word-level diff
      const { oldWords, newWords } = computeWordDiff(current.oldContent!, next.newContent!);
      current.type = 'modified';
      current.oldWordDiff = oldWords;
      current.newWordDiff = newWords;
      current.newContent = next.newContent;
      current.newLineNum = next.newLineNum;
      
      // Remove the 'added' line since we merged it
      allChanges.splice(idx + 1, 1);
    }
  }
  
  // Group into hunks (changed sections with context)
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;
  let unchangedBuffer: DiffLine[] = [];
  let contextAddedAfter = 0;
  
  for (const line of allChanges) {
    if (line.type === 'unchanged') {
      if (currentHunk && contextAddedAfter < contextLines) {
        // Add context after change
        currentHunk.lines.push(line);
        contextAddedAfter++;
      }
      
      unchangedBuffer.push(line);
      
      // Close hunk if we have enough separation
      if (currentHunk && unchangedBuffer.length > contextLines) {
        hunks.push(currentHunk);
        currentHunk = null;
        contextAddedAfter = 0;
        unchangedBuffer = unchangedBuffer.slice(-contextLines);
      }
    } else {
      // Changed line - start or continue hunk
      if (!currentHunk) {
        const contextBefore = unchangedBuffer.slice(-contextLines);
        currentHunk = {
          startLine: contextBefore.length > 0 ? (contextBefore[0].newLineNum || contextBefore[0].oldLineNum || 1) : (line.newLineNum || line.oldLineNum || 1),
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

  const displayContent = isEditing ? editedContent : localProposedContent;

  // Compute side-by-side diff with hunks
  const hunks = useMemo(() => {
    return computeSideBySideDiff(currentContent || '', displayContent || '');
  }, [currentContent, displayContent]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    let unchanged = 0;
    
    hunks.forEach(hunk => {
      hunk.lines.forEach(line => {
        if (line.type === 'added') added++;
        else if (line.type === 'removed') removed++;
        else if (line.type === 'modified') {
          added++;
          removed++;
        }
        else unchanged++;
      });
    });
    
    return { added, removed, unchanged, total: added + removed + unchanged };
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

      {/* WordPress-style side-by-side diff */}
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
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="w-12 px-2 py-1 text-xs text-muted-foreground text-right">#</th>
                      <th className="px-3 py-1 text-xs text-left text-red-700 dark:text-red-400">Removed</th>
                      <th className="w-12 px-2 py-1 text-xs text-muted-foreground text-right">#</th>
                      <th className="px-3 py-1 text-xs text-left text-green-700 dark:text-green-400">Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hunks.map((hunk, hunkIdx) => (
                      <React.Fragment key={hunkIdx}>
                        {hunk.lines.map((line, lineIdx) => (
                          <tr 
                            key={`${hunkIdx}-${lineIdx}`}
                            className="border-b"
                            data-testid={`diff-line-${hunkIdx}-${lineIdx}`}
                          >
                            {/* Left side (removed/old) */}
                            <td className="w-12 px-2 py-1 text-right text-muted-foreground text-xs bg-muted/10 select-none">
                              {line.oldLineNum || ''}
                            </td>
                            <td className={`px-3 py-1 whitespace-pre-wrap break-words ${
                              line.type === 'removed' || line.type === 'modified'
                                ? 'bg-red-50 dark:bg-red-950/20'
                                : ''
                            }`}>
                              {(line.type === 'removed' || line.type === 'modified') && line.oldContent && (
                                <>
                                  <span className="text-red-600 dark:text-red-400 mr-2 select-none">−</span>
                                  <span className="text-red-900 dark:text-red-100">
                                    {line.oldWordDiff ? (
                                      line.oldWordDiff.map((word, idx) => (
                                        <span
                                          key={idx}
                                          className={word.changed ? 'bg-red-200 dark:bg-red-900/40' : ''}
                                        >
                                          {word.text}
                                        </span>
                                      ))
                                    ) : (
                                      line.oldContent
                                    )}
                                  </span>
                                </>
                              )}
                              {line.type === 'unchanged' && (
                                <span className="text-foreground">{line.oldContent}</span>
                              )}
                            </td>
                            
                            {/* Right side (added/new) */}
                            <td className="w-12 px-2 py-1 text-right text-muted-foreground text-xs bg-muted/10 select-none">
                              {line.newLineNum || ''}
                            </td>
                            <td className={`px-3 py-1 whitespace-pre-wrap break-words ${
                              line.type === 'added' || line.type === 'modified'
                                ? 'bg-green-50 dark:bg-green-950/20'
                                : ''
                            }`}>
                              {(line.type === 'added' || line.type === 'modified') && line.newContent && (
                                <>
                                  <span className="text-green-600 dark:text-green-400 mr-2 select-none">+</span>
                                  <span className="text-green-900 dark:text-green-100">
                                    {line.newWordDiff ? (
                                      line.newWordDiff.map((word, idx) => (
                                        <span
                                          key={idx}
                                          className={word.changed ? 'bg-green-200 dark:bg-green-900/40' : ''}
                                        >
                                          {word.text}
                                        </span>
                                      ))
                                    ) : (
                                      line.newContent
                                    )}
                                  </span>
                                </>
                              )}
                              {line.type === 'unchanged' && (
                                <span className="text-foreground">{line.newContent}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    
                    {hunks.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                          No changes detected
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
