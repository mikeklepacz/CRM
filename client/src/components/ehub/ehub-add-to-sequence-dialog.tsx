import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Sequence } from "@/components/ehub/ehub.types";

interface EhubAddToSequenceDialogProps {
  open: boolean;
  selectAllMode: "none" | "page" | "all";
  allContactsTotal: number;
  selectedContactsCount: number;
  targetSequenceId: string;
  sequences: Sequence[] | undefined;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onTargetSequenceChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function EhubAddToSequenceDialog({
  open,
  selectAllMode,
  allContactsTotal,
  selectedContactsCount,
  targetSequenceId,
  sequences,
  isPending,
  onOpenChange,
  onTargetSequenceChange,
  onCancel,
  onSubmit,
}: EhubAddToSequenceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Contacts to Sequence</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {selectAllMode === "all"
              ? `Add all ${allContactsTotal} matching contacts to a sequence`
              : `Add ${selectedContactsCount} selected contact${selectedContactsCount !== 1 ? "s" : ""} to a sequence`}
          </p>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="targetSequence">Select Sequence</Label>
            <Select value={targetSequenceId} onValueChange={onTargetSequenceChange}>
              <SelectTrigger id="targetSequence" data-testid="select-target-sequence">
                <SelectValue placeholder="Choose a sequence..." />
              </SelectTrigger>
              <SelectContent>
                {sequences?.map((sequence) => (
                  <SelectItem
                    key={sequence.id}
                    value={sequence.id}
                    data-testid={`option-sequence-${sequence.id}`}
                  >
                    {sequence.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectAllMode === "all" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Bulk Add Confirmation</AlertTitle>
              <AlertDescription>
                This will add all {allContactsTotal} contacts matching your current filters to the selected sequence. Duplicates will be automatically skipped.
              </AlertDescription>
            </Alert>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} data-testid="button-cancel-add-to-sequence">
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!targetSequenceId || isPending}
            data-testid="button-submit-add-to-sequence"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add to Sequence
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
