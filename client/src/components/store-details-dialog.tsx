import type { StoreDetailsDialogProps } from "@/components/store-details/store-details.types";
import { StoreDetailsDialogCore } from "@/components/store-details/store-details-dialog-core";

export function StoreDetailsDialog(props: StoreDetailsDialogProps) {
  return <StoreDetailsDialogCore {...props} />;
}
