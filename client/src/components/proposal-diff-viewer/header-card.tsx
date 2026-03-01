import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, FileText, Save, XCircle } from "lucide-react";
import { Edit, Proposal } from "./types";

interface HeaderCardProps {
  proposal: Proposal;
  filename: string;
  localHumanEdited: boolean;
  isValidEdits: boolean;
  edits: Edit[];
  selectedCount: number;
  inlineEditsSize: number;
  isLocallyProcessing: boolean;
  isRejecting?: boolean;
  editPending: boolean;
  approvePending: boolean;
  onSaveInline: () => void;
  onApproveSelected: () => void;
  onReject: () => void;
}

export function ProposalHeaderCard({
  proposal,
  filename,
  localHumanEdited,
  isValidEdits,
  edits,
  selectedCount,
  inlineEditsSize,
  isLocallyProcessing,
  isRejecting,
  editPending,
  approvePending,
  onSaveInline,
  onApproveSelected,
  onReject,
}: HeaderCardProps) {
  return (
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
          <Badge variant={proposal.status === "pending" ? "default" : "secondary"} data-testid="badge-status">
            {proposal.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-muted/50 p-4" data-testid="text-rationale">
          <p className="text-sm font-medium mb-2">Why these changes are suggested:</p>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{proposal.rationale}</p>
        </div>

        {isValidEdits && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground" data-testid="text-stats-edits">
              {edits.length} {edits.length === 1 ? "edit" : "edits"} proposed
            </span>
          </div>
        )}

        {proposal.status === "pending" && (
          <div className="flex gap-2">
            {inlineEditsSize > 0 && (
              <Button onClick={onSaveInline} disabled={isLocallyProcessing || editPending} variant="outline" data-testid="button-save-edits">
                <Save className="h-4 w-4 mr-2" />
                {editPending ? "Saving..." : "Save Edits"}
              </Button>
            )}
            <Button
              onClick={onApproveSelected}
              disabled={isLocallyProcessing || approvePending || isRejecting || !isValidEdits || selectedCount === 0}
              data-testid="button-approve"
              className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {approvePending ? "Approving..." : `Approve ${selectedCount === edits.length ? "All" : selectedCount} ${selectedCount === 1 ? "Change" : "Changes"}`}
            </Button>
            <Button onClick={onReject} disabled={isLocallyProcessing || approvePending || isRejecting} variant="destructive" data-testid="button-reject">
              <XCircle className="h-4 w-4 mr-2" />
              {isRejecting ? "Rejecting..." : "Reject"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
