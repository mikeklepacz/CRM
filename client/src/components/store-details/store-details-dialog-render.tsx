import { Dialog, DialogContent } from "@/components/ui/dialog";
import { StoreDetailsDialogHeader } from "@/components/store-details/store-details-dialog-header";
import { UnsavedWarningDialog } from "@/components/store-details/unsaved-warning-dialog";
import { StoreDetailsDialogMainPane } from "@/components/store-details/store-details-dialog-main-pane";
import { StoreDetailsDialogFooterActions } from "@/components/store-details/store-details-dialog-footer-actions";
import { StoreDetailsDialogAuxDialogs } from "@/components/store-details/store-details-dialog-aux-dialogs";

export function StoreDetailsDialogRender(props: any) {
  return (
    <>
      <UnsavedWarningDialog
        open={props.showUnsavedWarning}
        onOpenChange={props.setShowUnsavedWarning}
        onConfirm={props.handleConfirmClose}
      />

      <Dialog open={props.open} onOpenChange={props.handleClose}>
        <DialogContent
          enableEnterSubmit={false}
          className={
            props.showAssistant
              ? "max-w-[95vw] h-[95vh] overflow-hidden flex flex-col"
              : "max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          }
        >
          <StoreDetailsDialogHeader
            autoLoadScript={props.autoLoadScript}
            formData={props.formData}
            getStoreName={props.getStoreName}
            handleAutoLoadScriptChange={props.handleAutoLoadScriptChange}
            handleHideListing={props.handleHideListing}
            handleInputChange={props.handleInputChange}
            handleShowAssistantChange={props.handleShowAssistantChange}
            handleUnclaim={props.handleUnclaim}
            initialData={props.initialData}
            nextStore={props.nextStore}
            onNavigateToStore={props.onNavigateToStore}
            prevStore={props.prevStore}
            row={props.row}
            saveMutation={props.saveMutation}
            showAssistant={props.showAssistant}
          />

          <StoreDetailsDialogMainPane {...props} />
          <StoreDetailsDialogFooterActions {...props} />
        </DialogContent>
      </Dialog>
      <StoreDetailsDialogAuxDialogs {...props} />
    </>
  );
}
