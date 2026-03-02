import { DuplicateFinderDialog } from "@/components/duplicate-finder-dialog";

interface DuplicateFinderSheetDialogProps {
  open: boolean;
  stores: any[];
  onOpenChange: (open: boolean) => void;
  onDuplicatesDeleted: () => void;
}

export function DuplicateFinderSheetDialog({
  open,
  stores,
  onOpenChange,
  onDuplicatesDeleted,
}: DuplicateFinderSheetDialogProps) {
  return (
    <DuplicateFinderDialog
      open={open}
      onOpenChange={onOpenChange}
      stores={stores}
      onDuplicatesDeleted={onDuplicatesDeleted}
    />
  );
}
