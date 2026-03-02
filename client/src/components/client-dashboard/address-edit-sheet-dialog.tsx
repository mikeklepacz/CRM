import { AddressEditDialog } from "@/components/address-edit-dialog";

interface AddressEditDialogState {
  open: boolean;
  row: any;
}

interface AddressEditSheetDialogProps {
  dialog: AddressEditDialogState | null;
  trackerSheetId: string;
  joinColumn: string;
  onClose: () => void;
}

export function AddressEditSheetDialog({
  dialog,
  trackerSheetId,
  joinColumn,
  onClose,
}: AddressEditSheetDialogProps) {
  if (!dialog) return null;

  return (
    <AddressEditDialog
      open={dialog.open}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      row={dialog.row}
      trackerSheetId={trackerSheetId}
      joinColumn={joinColumn}
    />
  );
}
