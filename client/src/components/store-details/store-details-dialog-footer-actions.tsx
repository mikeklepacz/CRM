import { DialogFooter } from "@/components/ui/dialog";
import { StoreDetailsActionButtons } from "@/components/store-details/store-details-action-buttons";

export function StoreDetailsDialogFooterActions(props: any) {
  const savePending = !!props.saveMutation?.isPending;

  if (props.showAssistant) return null;

  return (
    <DialogFooter>
      <StoreDetailsActionButtons
        currentColors={props.currentColors}
        isSavePending={savePending}
        onCall={props.handleCallFromDetails}
        onCancel={() => props.onOpenChange(false)}
        onSave={props.handleSave}
        onSaveAndExit={props.handleSaveAndExit}
        voip={props.voip}
      />
    </DialogFooter>
  );
}
