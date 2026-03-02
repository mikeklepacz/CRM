import { StoreDetailsDialog } from "@/components/store-details-dialog";

interface StoreDetailsDialogState {
  open: boolean;
  row: any;
}

interface StoreDetailsAnalyticsDialogProps {
  dialog: StoreDetailsDialogState | null;
  trackerSheetId: string | undefined;
  storeSheetId: string | undefined;
  refetch: () => Promise<any>;
  currentColors: any;
  statusOptions: string[];
  statusColors: { [status: string]: { background: string; text: string } };
  contextUpdateTrigger: number;
  onOpenChange: (open: boolean) => void;
  onContextUpdateTriggerChange: (value: number | ((prev: number) => number)) => void;
}

export function StoreDetailsAnalyticsDialog({
  dialog,
  trackerSheetId,
  storeSheetId,
  refetch,
  currentColors,
  statusOptions,
  statusColors,
  contextUpdateTrigger,
  onOpenChange,
  onContextUpdateTriggerChange,
}: StoreDetailsAnalyticsDialogProps) {
  if (!dialog) return null;

  return (
    <StoreDetailsDialog
      open={dialog.open}
      onOpenChange={onOpenChange}
      row={dialog.row}
      trackerSheetId={trackerSheetId}
      storeSheetId={storeSheetId}
      refetch={refetch}
      currentColors={currentColors}
      statusOptions={statusOptions}
      statusColors={statusColors}
      contextUpdateTrigger={contextUpdateTrigger}
      setContextUpdateTrigger={onContextUpdateTriggerChange}
      loadDefaultScriptTrigger={0}
    />
  );
}
