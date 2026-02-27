import { StoreDetailsDialog } from "@/components/store-details-dialog";

interface StoreDetailsDialogState {
  open: boolean;
  row: any;
  franchiseContext?: {
    brandName: string;
    allLocations: any[];
  };
}

interface StoreDetailsSheetDialogProps {
  dialog: StoreDetailsDialogState | null;
  trackerSheetId: string;
  storeSheetId: string;
  refetch: () => Promise<any>;
  currentColors: any;
  statusOptions: string[];
  statusColors: { [status: string]: { background: string; text: string } };
  contextUpdateTrigger: number;
  loadDefaultScriptTrigger: number;
  allVisibleStores: any[];
  onClose: () => void;
  onContextUpdateTriggerChange: (value: number | ((prev: number) => number)) => void;
  onLoadDefaultScriptTriggerChange: (value: number | ((prev: number) => number)) => void;
  onNavigateToStore: (row: any) => void;
}

export function StoreDetailsSheetDialog({
  dialog,
  trackerSheetId,
  storeSheetId,
  refetch,
  currentColors,
  statusOptions,
  statusColors,
  contextUpdateTrigger,
  loadDefaultScriptTrigger,
  allVisibleStores,
  onClose,
  onContextUpdateTriggerChange,
  onLoadDefaultScriptTriggerChange,
  onNavigateToStore,
}: StoreDetailsSheetDialogProps) {
  if (!dialog) return null;

  return (
    <StoreDetailsDialog
      open={dialog.open}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      row={dialog.row}
      trackerSheetId={trackerSheetId}
      storeSheetId={storeSheetId}
      refetch={refetch}
      franchiseContext={dialog.franchiseContext}
      currentColors={currentColors}
      statusOptions={statusOptions}
      statusColors={statusColors}
      contextUpdateTrigger={contextUpdateTrigger}
      setContextUpdateTrigger={onContextUpdateTriggerChange}
      loadDefaultScriptTrigger={loadDefaultScriptTrigger}
      allVisibleStores={allVisibleStores}
      onNavigateToStore={(newRow) => {
        onNavigateToStore(newRow);
        onLoadDefaultScriptTriggerChange((prev) => prev + 1);
      }}
    />
  );
}
