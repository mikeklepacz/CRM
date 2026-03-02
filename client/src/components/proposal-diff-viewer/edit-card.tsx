import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { calculateRows } from "./helpers";
import { Edit } from "./types";

interface EditCardProps {
  edit: Edit;
  idx: number;
  isSelected: boolean;
  isFailed: boolean;
  isPendingStatus: boolean;
  isLocallyProcessing: boolean;
  approvePending: boolean;
  isRejecting?: boolean;
  isInlineEdited: boolean;
  newText: string;
  onToggleSelected: (idx: number) => void;
  onInlineEdit: (idx: number, value: string) => void;
  onApproveSingle: (idx: number) => void;
  onSkipSingle: (idx: number) => void;
}

export function ProposalEditCard({
  edit,
  idx,
  isSelected,
  isFailed,
  isPendingStatus,
  isLocallyProcessing,
  approvePending,
  isRejecting,
  isInlineEdited,
  newText,
  onToggleSelected,
  onInlineEdit,
  onApproveSingle,
  onSkipSingle,
}: EditCardProps) {
  return (
    <Card data-testid={`card-edit-${idx}`} className={`${!isSelected ? "opacity-50" : ""} ${isFailed ? "border-red-500 dark:border-red-700 border-2" : ""}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelected(idx)}
              data-testid={`checkbox-edit-${idx}`}
              className="mt-1"
              disabled={isFailed}
            />
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Edit {idx + 1}
                {edit.section && <Badge variant="outline" data-testid={`badge-section-${idx}`}>{edit.section}</Badge>}
                {isFailed && (
                  <Badge variant="destructive" className="flex items-center gap-1" data-testid={`badge-failed-${idx}`}>
                    <AlertCircle className="h-3 w-3" />
                    Text No Longer Exists
                  </Badge>
                )}
              </CardTitle>
              {edit.principle && <CardDescription data-testid={`text-principle-${idx}`}>Principle: {edit.principle}</CardDescription>}
            </div>
          </div>
          {isPendingStatus && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onApproveSingle(idx)}
                disabled={isLocallyProcessing || approvePending || isRejecting || isFailed}
                data-testid={`button-approve-single-${idx}`}
                className="bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900 border-green-300 dark:border-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => onSkipSingle(idx)} data-testid={`button-skip-single-${idx}`}>
                <XCircle className="h-4 w-4 mr-1" />
                Skip
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-muted/50 p-3" data-testid={`text-reason-${idx}`}>
          <p className="text-sm font-medium mb-1">Reason:</p>
          <p className="text-sm text-muted-foreground">{edit.reason}</p>
        </div>

        <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3" data-testid={`text-evidence-${idx}`}>
          <p className="text-sm font-medium mb-1 text-blue-900 dark:text-blue-100">Evidence:</p>
          <p className="text-sm text-blue-800 dark:text-blue-200 italic">{edit.evidence}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-red-500"></div>
              <p className="text-sm font-medium text-red-900 dark:text-red-100">Before</p>
            </div>
            <div className="rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-3" data-testid={`text-before-${idx}`}>
              <p className="text-sm text-red-900 dark:text-red-100 whitespace-pre-wrap font-mono">{edit.old}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-green-500"></div>
              <p className="text-sm font-medium text-green-900 dark:text-green-100">After {isInlineEdited && <span className="text-xs">(edited)</span>}</p>
            </div>
            <Textarea
              value={newText}
              onChange={(e) => onInlineEdit(idx, e.target.value)}
              rows={calculateRows(newText)}
              className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 text-sm text-green-900 dark:text-green-100 whitespace-pre-wrap font-mono focus-visible:ring-green-500"
              data-testid={`textarea-after-${idx}`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
