import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DeleteCallDialogProps {
  open: boolean;
  callToDelete: string | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteCallDialog({
  open,
  callToDelete,
  isPending,
  onOpenChange,
  onCancel,
  onConfirm,
}: DeleteCallDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-delete-call">
        <DialogHeader>
          <DialogTitle>Delete Call</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this call? This will permanently remove it from both ElevenLabs and your local database.
          </p>
          <p className="text-sm font-medium text-destructive">
            This action cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onCancel} data-testid="button-cancel-delete">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={!callToDelete || isPending}
            data-testid="button-confirm-delete"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Call"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
