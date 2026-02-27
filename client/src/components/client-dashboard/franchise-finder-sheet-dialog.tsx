import type { FranchiseGroup } from "@shared/franchiseUtils";
import { FranchiseFinderDialog } from "@/components/franchise-finder-dialog";

interface FranchiseFinderSheetDialogProps {
  open: boolean;
  stores: any[];
  onOpenChange: (open: boolean) => void;
  onSelectFranchise: (franchise: FranchiseGroup) => void;
}

export function FranchiseFinderSheetDialog({
  open,
  stores,
  onOpenChange,
  onSelectFranchise,
}: FranchiseFinderSheetDialogProps) {
  return (
    <FranchiseFinderDialog
      open={open}
      onOpenChange={onOpenChange}
      stores={stores}
      onSelectFranchise={onSelectFranchise}
    />
  );
}
