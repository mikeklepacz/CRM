import type { StoreDetailsDialogProps } from "@/components/store-details/store-details.types";
import { StoreDetailsDialogCoreImpl } from "@/components/store-details/store-details-dialog-core-impl";

export function StoreDetailsDialogCore(props: StoreDetailsDialogProps) {
  return <StoreDetailsDialogCoreImpl {...props} />;
}
