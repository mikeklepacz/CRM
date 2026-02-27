import { Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface EhubBulkDeleteRecipientsDialogProps {
  open: boolean;
  selectedCount: number;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function EhubBulkDeleteRecipientsDialog({
  open,
  selectedCount,
  isPending,
  onOpenChange,
  onConfirm,
}: EhubBulkDeleteRecipientsDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Recipients?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete {selectedCount} recipient{selectedCount !== 1 ? "s" : ""}? They will be removed from the email sequence and all scheduled slots will be cleared.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            data-testid="button-confirm-bulk-delete"
            data-primary="true"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
