import type { StoreDetailsDialogProps } from "@/components/store-details/store-details.types";
import { StoreDetailsDialogCoreLogic } from "@/components/store-details/store-details-dialog-core-logic";

export function StoreDetailsDialogCoreImpl(props: StoreDetailsDialogProps) {
  return <StoreDetailsDialogCoreLogic {...props} />;
}
