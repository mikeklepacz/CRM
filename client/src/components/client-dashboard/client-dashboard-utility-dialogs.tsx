import { CallHistorySheetDialog } from "@/components/client-dashboard/call-history-sheet-dialog";
import { DuplicateFinderSheetDialog } from "@/components/client-dashboard/duplicate-finder-sheet-dialog";
import { FranchiseFinderSheetDialog } from "@/components/client-dashboard/franchise-finder-sheet-dialog";

type ClientDashboardUtilityDialogsProps = {
  callHistoryOpen: boolean;
  data: any[];
  duplicateFinderOpen: boolean;
  franchiseFinderOpen: boolean;
  onCallHistoryOpenChange: (open: boolean) => void;
  onDial: (phoneNumber: string) => void;
  onDuplicatesDeleted: () => void;
  onDuplicateFinderOpenChange: (open: boolean) => void;
  onFranchiseFinderOpenChange: (open: boolean) => void;
  onSelectFranchise: (franchise: any) => void;
  onShowStore: (matchingStore: any) => void;
};

export function ClientDashboardUtilityDialogs({
  callHistoryOpen,
  data,
  duplicateFinderOpen,
  franchiseFinderOpen,
  onCallHistoryOpenChange,
  onDial,
  onDuplicatesDeleted,
  onDuplicateFinderOpenChange,
  onFranchiseFinderOpenChange,
  onSelectFranchise,
  onShowStore,
}: ClientDashboardUtilityDialogsProps) {
  return (
    <>
      <FranchiseFinderSheetDialog
        open={franchiseFinderOpen}
        onOpenChange={onFranchiseFinderOpenChange}
        stores={data}
        onSelectFranchise={onSelectFranchise}
      />

      <DuplicateFinderSheetDialog
        open={duplicateFinderOpen}
        onOpenChange={onDuplicateFinderOpenChange}
        stores={data}
        onDuplicatesDeleted={onDuplicatesDeleted}
      />

      <CallHistorySheetDialog
        open={callHistoryOpen}
        stores={data}
        onOpenChange={onCallHistoryOpenChange}
        onShowStore={onShowStore}
        onDial={onDial}
      />
    </>
  );
}
