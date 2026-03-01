import type { FranchiseGroup, StoreData } from "@shared/franchiseUtils";

export interface FranchiseFinderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: StoreData[];
  onSelectFranchise: (franchise: FranchiseGroup) => void;
}
