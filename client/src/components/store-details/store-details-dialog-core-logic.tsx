import type { StoreDetailsDialogProps } from "@/components/store-details/store-details.types";
import { StoreDetailsDialogController } from "@/components/store-details/store-details-dialog-controller";

export function StoreDetailsDialogCoreLogic(props: StoreDetailsDialogProps) {
  return <StoreDetailsDialogController {...props} />;
}
