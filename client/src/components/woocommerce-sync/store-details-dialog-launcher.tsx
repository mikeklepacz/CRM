import { useQuery } from "@tanstack/react-query";
import { StoreDetailsDialog } from "@/components/store-details-dialog";
import { useCustomTheme } from "@/hooks/use-custom-theme";

type DialogState = {
  open: boolean;
  row: any;
};

type Props = {
  dialog: DialogState | null;
  setDialog: (value: DialogState | null) => void;
  refetch: () => Promise<any>;
};

export function StoreDetailsDialogLauncher({ dialog, setDialog, refetch }: Props) {
  const { currentColors, statusOptions, statusColors } = useCustomTheme();
  const { data: sheetsData } = useQuery<any>({
    queryKey: ["/api/sheets"],
  });

  const sheets = sheetsData?.sheets || [];
  const trackerSheet = sheets.find((s: any) => s.sheetPurpose === "commissions" || s.purpose === "commissions");
  const storeSheet = sheets.find((s: any) => s.sheetPurpose === "Store Database" || s.purpose === "Store Database");
  const trackerSheetId = trackerSheet?.id;
  const storeSheetId = storeSheet?.id;

  if (!dialog) return null;

  return (
    <StoreDetailsDialog
      open={dialog.open}
      onOpenChange={(open) => setDialog(open ? dialog : null)}
      row={dialog.row}
      trackerSheetId={trackerSheetId}
      storeSheetId={storeSheetId}
      refetch={refetch}
      currentColors={currentColors}
      statusOptions={statusOptions}
      statusColors={statusColors}
      contextUpdateTrigger={0}
      setContextUpdateTrigger={(_value) => {}}
      loadDefaultScriptTrigger={0}
    />
  );
}
