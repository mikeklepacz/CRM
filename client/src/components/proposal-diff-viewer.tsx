import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, FileText, Edit2, Save, AlertCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [editedContent, setEditedContent] = useState(proposedContent);
  const [localProposedContent, setLocalProposedContent] = useState(proposedContent);
  const [localHumanEdited, setLocalHumanEdited] = useState(proposal.humanEdited || false);
  const [selectedEdits, setSelectedEdits] = useState<Set<number>>(new Set());
  const [inlineEdits, setInlineEdits] = useState<Map<number, string>>(new Map());

  // Sync local state when proposal changes
  useEffect(() => {
    setEditedContent(proposedContent);
    setLocalProposedContent(proposedContent);
    setLocalHumanEdited(proposal.humanEdited || false);
    setInlineEdits(new Map());
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

  // Validate edits - allow empty 'old' for adding new content, but require 'new' and 'reason'
  const isValidEdits = edits.length > 0 && edits.every(e => 
    'old' in e && 'new' in e && 'reason' in e && e.new && e.reason
  );

  // Initialize selected edits to all edits when edits change
  useEffect(() => {
    if (edits.length > 0) {
      setSelectedEdits(new Set(edits.map((_, idx) => idx)));
    }
  }, [edits.length]);

  // Toggle edit selection
  const toggleEditSelection = (index: number) => {
    const newSelected = new Set(selectedEdits);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedEdits(newSelected);
  };

  // Handle inline edit of "new" text
  const handleInlineEdit = (index: number, newValue: string) => {
    const newInlineEdits = new Map(inlineEdits);
    // If the value matches the original, remove the edit entry
    if (newValue === edits[index]?.new) {
      newInlineEdits.delete(index);
    } else {
      newInlineEdits.set(index, newValue);
    }
    setInlineEdits(newInlineEdits);
  };

  // Save inline edits to backend
  const saveInlineEdits = () => {
    if (inlineEdits.size === 0) return;

    // Apply inline edits to the edits array
    const updatedEdits = edits.map((edit, idx) => {
      if (inlineEdits.has(idx)) {
        return { ...edit, new: inlineEdits.get(idx)! };
      }
      return edit;
    });

    const jsonContent = JSON.stringify(updatedEdits, null, 2);
    setEditedContent(jsonContent);
    editMutation.mutate({ 
      content: jsonContent,
      savedIndices: Array.from(inlineEdits.keys())
    });
  };

  // Get the current "new" text for an edit (either inline edited or original)
  const getNewText = (index: number): string => {
    return inlineEdits.get(index) ?? edits[index]?.new ?? '';
  };

  // Calculate rows needed for textarea to show full content
  const calculateRows = (text: string): number => {
    const lines = text.split('\n');
    const charsPerLine = 60; // Approximate chars per line in mono font at this width
    
    // Count explicit line breaks + wrapped lines
    let totalRows = 0;
    lines.forEach(line => {
      if (line.length === 0) {
        totalRows += 1; // Empty line
      } else {
        totalRows += Math.ceil(line.length / charsPerLine);
      }
    });
    
    const minRows = 3;
    const maxRows = 50;
    return Math.min(Math.max(totalRows, minRows), maxRows);
  };

  // Approve only selected edits (or specific edits passed as parameter)
  const handleApproveSelected = async (editsToApprove?: Set<number>) => {
    const editsSet = editsToApprove || selectedEdits;
    
    if (editsSet.size === 0) {
      toast({
        title: "No Edits Selected",
        description: "Please select at least one edit to approve",
        variant: "destructive",
      });
      return;
    }

    // If there are any inline edits, save them first
    if (inlineEdits.size > 0) {
      // Apply inline edits to ALL cards
      const updatedEdits = edits.map((edit, idx) => {
        if (inlineEdits.has(idx)) {
          return { ...edit, new: inlineEdits.get(idx)! };
        }
        return edit;
      });

      // Save the full proposal with all inline edits
      const fullJson = JSON.stringify(updatedEdits, null, 2);
      try {
        await apiRequest('PATCH', `/api/kb/proposals/${proposal.id}`, { proposedContent: fullJson });
        // Update local state
        setLocalProposedContent(fullJson);
        setLocalHumanEdited(true);
        setInlineEdits(new Map()); // Clear all inline edits after successful save
        queryClient.invalidateQueries({ queryKey: ['/api/kb/proposals'] });
        
        toast({
          title: "Changes Saved",
          description: "Your edits have been saved",
        });
      } catch (error) {
        toast({
          title: "Save Failed",
          description: "Failed to save inline edits before approval",
          variant: "destructive",
        });
        return;
      }
    }

    // Now proceed with approval based on selection
    if (editsSet.size === edits.length) {
      // All edits selected, approve directly
      onApprove?.();
    } else {
      // Partial selection, need to filter to selected edits only
      const selectedEditsArray = edits.filter((_, idx) => editsSet.has(idx));
      const filteredJson = JSON.stringify(selectedEditsArray, null, 2);
      setEditedContent(filteredJson);
      
      editMutation.mutate({ 
        content: filteredJson,
        savedIndices: Array.from(editsSet)
      }, {
        onSuccess: () => {
          onApprove?.();
        }
      });
    }
  };

  // Edit proposal mutation
  const editMutation = useMutation({
    mutationFn: (params: { content: string; savedIndices?: number[] }) => 
      apiRequest('PATCH', `/api/kb/proposals/${proposal.id}`, { proposedContent: params.content }),
    onSuccess: (_data, variables) => {
      toast({
        title: "Changes Saved",
        description: "Your edits have been saved to the proposal",
      });
      setLocalProposedContent(editedContent);
      setLocalHumanEdited(true);
      
      // Only clear inline edits for the indices that were saved
      if (variables.savedIndices) {
        const newInlineEdits = new Map(inlineEdits);
        variables.savedIndices.forEach(idx => newInlineEdits.delete(idx));
        setInlineEdits(newInlineEdits);
      } else {
        // If no specific indices, clear all
        setInlineEdits(new Map());
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/kb/proposals'] });
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
              {inlineEdits.size > 0 && (
                <Button
                  onClick={saveInlineEdits}
                  disabled={editMutation.isPending}
                  variant="outline"
                  data-testid="button-save-edits"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editMutation.isPending ? 'Saving...' : 'Save Edits'}
                </Button>
              )}
              <Button
                onClick={handleApproveSelected}
                disabled={isApproving || isRejecting || !isValidEdits || selectedEdits.size === 0}
                data-testid="button-approve"
                className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isApproving ? 'Approving...' : `Approve ${selectedEdits.size === edits.length ? 'All' : selectedEdits.size} ${selectedEdits.size === 1 ? 'Change' : 'Changes'}`}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual edits view */}
      {(
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
                <Card key={idx} data-testid={`card-edit-${idx}`} className={!selectedEdits.has(idx) ? 'opacity-50' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={selectedEdits.has(idx)}
                          onCheckedChange={() => toggleEditSelection(idx)}
                          data-testid={`checkbox-edit-${idx}`}
                          className="mt-1"
                        />
                        <div className="flex-1">
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
                        </div>
                      </div>
                      {proposal.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Approve only this specific edit
                              handleApproveSelected(new Set([idx]));
                            }}
                            disabled={isApproving || isRejecting}
                            data-testid={`button-approve-single-${idx}`}
                            className="bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900 border-green-300 dark:border-green-700"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newSelected = new Set(selectedEdits);
                              newSelected.delete(idx);
                              setSelectedEdits(newSelected);
                            }}
                            data-testid={`button-skip-single-${idx}`}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Skip
                          </Button>
                        </div>
                      )}
                    </div>
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

                      {/* After (Editable) */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-1 w-1 rounded-full bg-green-500"></div>
                          <p className="text-sm font-medium text-green-900 dark:text-green-100">After {inlineEdits.has(idx) && <span className="text-xs">(edited)</span>}</p>
                        </div>
                        <Textarea
                          value={getNewText(idx)}
                          onChange={(e) => handleInlineEdit(idx, e.target.value)}
                          rows={calculateRows(getNewText(idx))}
                          className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 text-sm text-green-900 dark:text-green-100 whitespace-pre-wrap font-mono focus-visible:ring-green-500"
                          data-testid={`textarea-after-${idx}`}
                        />
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
