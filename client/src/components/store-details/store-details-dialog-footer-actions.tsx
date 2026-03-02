import { DialogFooter } from "@/components/ui/dialog";
import { StoreDetailsActionButtons } from "@/components/store-details/store-details-action-buttons";

export function StoreDetailsDialogFooterActions(props: any) {
  if (props.showAssistant) return null;

  return (
    <DialogFooter>
      <StoreDetailsActionButtons
        currentColors={props.currentColors}
        isSavePending={props.saveMutation.isPending}
        onCall={props.handleCallFromDetails}
        onCancel={() => props.onOpenChange(false)}
        onSave={props.handleSave}
        onSaveAndExit={props.handleSaveAndExit}
        voip={props.voip}
      />
    </DialogFooter>
  );
}
