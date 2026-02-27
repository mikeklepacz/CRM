import { normalizeLink } from "@shared/linkUtils";
import { CallHistoryDialog } from "@/components/call-history-dialog";
import { getLinkValue } from "@/components/client-dashboard/region-utils";

interface CallHistorySheetDialogProps {
  open: boolean;
  stores: any[];
  onOpenChange: (open: boolean) => void;
  onShowStore: (row: any) => void;
  onDial: (phoneNumber: string) => void;
}

export function CallHistorySheetDialog({
  open,
  stores,
  onOpenChange,
  onShowStore,
  onDial,
}: CallHistorySheetDialogProps) {
  return (
    <CallHistoryDialog
      open={open}
      onOpenChange={onOpenChange}
      onCallStore={(storeLink, phoneNumber) => {
        const matchingStore = stores.find((row: any) => {
          const link = getLinkValue(row);
          if (!link) return false;

          const normalizedRowLink = normalizeLink(link);
          const normalizedSearchLink = normalizeLink(storeLink);
          return normalizedRowLink === normalizedSearchLink;
        });

        if (matchingStore) {
          onShowStore(matchingStore);
          setTimeout(() => {
            onDial(phoneNumber);
          }, 800);
        }
      }}
    />
  );
}
