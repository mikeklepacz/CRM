import type { Dispatch, SetStateAction } from "react";
import { CallDetailDialog } from "@/components/call-detail-dialog";
import { DeleteCallDialog } from "@/components/call-manager/delete-call-dialog";
import { StoreDetailsAnalyticsDialog } from "@/components/call-manager/store-details-analytics-dialog";
import { NukeAnalysisDialog } from "@/components/call-manager/nuke-analysis-dialog";
import { NukeCallDataDialog } from "@/components/call-manager/nuke-call-data-dialog";

interface CallManagerDialogsProps {
  callToDelete: string | null;
  contextUpdateTrigger: number;
  currentColors: any;
  deleteCallIsPending: boolean;
  isCallDialogOpen: boolean;
  isDeleteDialogOpen: boolean;
  isNukeCallDataDialogOpen: boolean;
  isNukeDialogOpen: boolean;
  nukeAnalysisIsPending: boolean;
  nukeCallDataIsPending: boolean;
  onCallDialogOpenChange: (open: boolean) => void;
  onCancelDeleteCall: () => void;
  onConfirmDeleteCall: () => void;
  onConfirmNukeAnalysis: () => void;
  onConfirmNukeCallData: () => void;
  onDeleteDialogOpenChange: (open: boolean) => void;
  onNukeCallDataDialogOpenChange: (open: boolean) => void;
  onNukeDialogOpenChange: (open: boolean) => void;
  onSetContextUpdateTrigger: Dispatch<SetStateAction<number>>;
  onStoreDetailsDialogOpenChange: (open: boolean) => void;
  refetchAnalytics: () => Promise<any>;
  selectedCallForDialog: { conversationId: string; callData: any } | null;
  statusColors: any;
  statusOptions: string[];
  storeDetailsDialog: { open: boolean; row: any } | null;
  storeSheetId?: string;
  trackerSheetId?: string;
}

export function CallManagerDialogs({
  callToDelete,
  contextUpdateTrigger,
  currentColors,
  deleteCallIsPending,
  isCallDialogOpen,
  isDeleteDialogOpen,
  isNukeCallDataDialogOpen,
  isNukeDialogOpen,
  nukeAnalysisIsPending,
  nukeCallDataIsPending,
  onCallDialogOpenChange,
  onCancelDeleteCall,
  onConfirmDeleteCall,
  onConfirmNukeAnalysis,
  onConfirmNukeCallData,
  onDeleteDialogOpenChange,
  onNukeCallDataDialogOpenChange,
  onNukeDialogOpenChange,
  onSetContextUpdateTrigger,
  onStoreDetailsDialogOpenChange,
  refetchAnalytics,
  selectedCallForDialog,
  statusColors,
  statusOptions,
  storeDetailsDialog,
  storeSheetId,
  trackerSheetId,
}: CallManagerDialogsProps) {
  return (
    <>
      {/* Call Detail Dialog */}
      <CallDetailDialog
        open={isCallDialogOpen}
        onOpenChange={onCallDialogOpenChange}
        conversationId={selectedCallForDialog?.conversationId || null}
        callData={selectedCallForDialog?.callData || null}
        trackerSheetId={trackerSheetId}
        storeSheetId={storeSheetId}
        refetch={refetchAnalytics}
        currentColors={currentColors}
        statusOptions={statusOptions}
        statusColors={statusColors}
        contextUpdateTrigger={contextUpdateTrigger}
        setContextUpdateTrigger={onSetContextUpdateTrigger}
      />

      <DeleteCallDialog
        open={isDeleteDialogOpen}
        callToDelete={callToDelete}
        isPending={deleteCallIsPending}
        onOpenChange={onDeleteDialogOpenChange}
        onCancel={onCancelDeleteCall}
        onConfirm={onConfirmDeleteCall}
      />

      <StoreDetailsAnalyticsDialog
        dialog={storeDetailsDialog}
        trackerSheetId={trackerSheetId}
        storeSheetId={storeSheetId}
        refetch={refetchAnalytics}
        currentColors={currentColors}
        statusOptions={statusOptions}
        statusColors={statusColors}
        contextUpdateTrigger={contextUpdateTrigger}
        onOpenChange={onStoreDetailsDialogOpenChange}
        onContextUpdateTriggerChange={onSetContextUpdateTrigger}
      />

      <NukeAnalysisDialog
        open={isNukeDialogOpen}
        isPending={nukeAnalysisIsPending}
        onOpenChange={onNukeDialogOpenChange}
        onConfirm={onConfirmNukeAnalysis}
      />

      <NukeCallDataDialog
        open={isNukeCallDataDialogOpen}
        isPending={nukeCallDataIsPending}
        onOpenChange={onNukeCallDataDialogOpenChange}
        onConfirm={onConfirmNukeCallData}
      />
    </>
  );
}
