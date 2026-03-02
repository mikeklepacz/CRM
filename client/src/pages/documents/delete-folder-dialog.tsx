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

interface DeleteFolderDialogProps {
  folderToDelete: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteFolderDialog({ folderToDelete, onCancel, onConfirm }: DeleteFolderDialogProps) {
  return (
    <AlertDialog open={!!folderToDelete} onOpenChange={onCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Folder?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove the folder from your document browser. Files in Google Drive will not be affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} data-testid="button-confirm-delete-folder" data-primary="true">
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
