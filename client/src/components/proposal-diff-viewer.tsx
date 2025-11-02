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
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(proposedContent);
  const [localProposedContent, setLocalProposedContent] = useState(proposedContent);
  const [localHumanEdited, setLocalHumanEdited] = useState(proposal.humanEdited || false);
  const [editFormData, setEditFormData] = useState<Edit[]>([]);
  const [selectedEdits, setSelectedEdits] = useState<Set<number>>(new Set());

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

  // Approve only selected edits
  const handleApproveSelected = () => {
    if (selectedEdits.size === 0) {
      toast({
        title: "No Edits Selected",
        description: "Please select at least one edit to approve",
        variant: "destructive",
      });
      return;
    }

    // If all edits are selected, just approve normally
    if (selectedEdits.size === edits.length) {
      onApprove?.();
      return;
    }

    // Otherwise, save filtered edits first, then approve
    const selectedEditsArray = edits.filter((_, idx) => selectedEdits.has(idx));
    const filteredJson = JSON.stringify(selectedEditsArray, null, 2);
    setEditedContent(filteredJson); // Update state before mutation
    
    editMutation.mutate(filteredJson, {
      onSuccess: () => {
        // After saving filtered edits, approve the proposal
        onApprove?.();
      }
    });
  };

  // Initialize edit form data when entering edit mode
  const handleStartEditing = () => {
    setEditFormData(JSON.parse(JSON.stringify(edits))); // Deep copy
    setIsEditing(true);
  };

  // Update individual edit field
  const updateEditField = (index: number, field: keyof Edit, value: string) => {
    const newData = [...editFormData];
    newData[index] = { ...newData[index], [field]: value };
    setEditFormData(newData);
  };

  // Remove an edit
  const removeEdit = (index: number) => {
    const newData = editFormData.filter((_, i) => i !== index);
    setEditFormData(newData);
  };

  // Save form data as JSON
  const handleSaveFormEdits = () => {
    const jsonContent = JSON.stringify(editFormData, null, 2);
    setEditedContent(jsonContent); // Update state so mutation onSuccess sees the new content
    editMutation.mutate(jsonContent);
  };

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
                    onClick={handleStartEditing}
                    variant="outline"
                    data-testid="button-edit"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Changes
                  </Button>
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
                </>
              ) : (
                <>
                  <Button
                    onClick={handleSaveFormEdits}
                    disabled={editMutation.isPending}
                    data-testid="button-save-edits"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editMutation.isPending ? 'Saving...' : 'Save Edits'}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      setEditFormData([]);
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
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-4">
            {editFormData.map((edit, idx) => (
              <Card key={idx} data-testid={`card-edit-form-${idx}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Edit {idx + 1}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEdit(idx)}
                      data-testid={`button-remove-edit-${idx}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Section */}
                  <div className="space-y-2">
                    <Label htmlFor={`section-${idx}`}>Section (optional)</Label>
                    <Input
                      id={`section-${idx}`}
                      value={edit.section || ''}
                      onChange={(e) => updateEditField(idx, 'section', e.target.value)}
                      placeholder="e.g., Pricing Transparency"
                      data-testid={`input-section-${idx}`}
                    />
                  </div>

                  {/* Old text */}
                  <div className="space-y-2">
                    <Label htmlFor={`old-${idx}`}>Old Text</Label>
                    <Textarea
                      id={`old-${idx}`}
                      value={edit.old}
                      onChange={(e) => updateEditField(idx, 'old', e.target.value)}
                      className="min-h-[80px]"
                      data-testid={`textarea-old-${idx}`}
                    />
                  </div>

                  {/* New text */}
                  <div className="space-y-2">
                    <Label htmlFor={`new-${idx}`}>New Text</Label>
                    <Textarea
                      id={`new-${idx}`}
                      value={edit.new}
                      onChange={(e) => updateEditField(idx, 'new', e.target.value)}
                      className="min-h-[80px]"
                      data-testid={`textarea-new-${idx}`}
                    />
                  </div>

                  {/* Reason */}
                  <div className="space-y-2">
                    <Label htmlFor={`reason-${idx}`}>Reason</Label>
                    <Textarea
                      id={`reason-${idx}`}
                      value={edit.reason}
                      onChange={(e) => updateEditField(idx, 'reason', e.target.value)}
                      className="min-h-[60px]"
                      data-testid={`textarea-reason-${idx}`}
                    />
                  </div>

                  {/* Evidence */}
                  <div className="space-y-2">
                    <Label htmlFor={`evidence-${idx}`}>Evidence</Label>
                    <Textarea
                      id={`evidence-${idx}`}
                      value={edit.evidence}
                      onChange={(e) => updateEditField(idx, 'evidence', e.target.value)}
                      className="min-h-[60px]"
                      data-testid={`textarea-evidence-${idx}`}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
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
                              const newSelected = new Set([idx]);
                              setSelectedEdits(newSelected);
                              setTimeout(() => handleApproveSelected(), 100);
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
