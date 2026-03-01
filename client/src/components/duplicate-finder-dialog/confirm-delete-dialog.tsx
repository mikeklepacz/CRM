import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDeleteDialogProps {
  open: boolean;
  selectedCount: number;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
}

export function ConfirmDeleteDialog({
  open,
  selectedCount,
  onOpenChange,
  onConfirmDelete,
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Deletion & Data Merge</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {selectedCount} duplicate {selectedCount === 1 ? "store" : "stores"}?
            <br />
            <br />
            <strong>What will happen:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Data from duplicates will be merged into the keeper stores</li>
              <li>Commission Tracker references will be updated to the keeper stores</li>
              <li>Duplicate rows will be permanently deleted from the Store Database</li>
            </ul>
            <br />
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-confirm-cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-confirm-delete"
            data-primary="true"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
