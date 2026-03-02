import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { SystemHealthBanner } from "@/components/SystemHealthBanner";
import { CallManagerHeader } from "@/components/call-manager/call-manager-header";
import { CallManagerTopTabs } from "@/components/call-manager/call-manager-top-tabs";
import { CallManagerDialogs } from "@/components/call-manager/call-manager-dialogs";

export function CallManagerPageView(props: any) {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <SystemHealthBanner />

        {props.queries.blockedDayData?.blocked && (
          <Card className="border-destructive bg-destructive/10" data-testid="card-blocked-day-warning">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0" />
                <div>
                  <p className="font-semibold text-destructive" data-testid="text-blocked-day-title">NO CALLS TODAY</p>
                  <p className="text-sm text-destructive/80" data-testid="text-blocked-day-reason">
                    {props.queries.blockedDayData.reason || "Today is blocked for outbound calls"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {props.queries.jobStatus?.status === "running" && (
          <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950/20" data-testid="card-analysis-progress">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100" data-testid="text-progress-status">
                        Analyzing Calls: {props.queries.jobStatus.job.currentCallIndex || 0} of {props.queries.jobStatus.job.totalCalls || 0}
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300" data-testid="text-progress-details">
                        {props.queries.jobStatus.job.type === "aligner" ? "KB Analysis" : "Wick Coach Analysis"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <CallManagerHeader
            canAccessAdmin={props.canAccessAdmin}
            setIsNukeCallDataDialogOpen={props.state.setIsNukeCallDataDialogOpen}
            voiceProxyStatus={props.queries.voiceProxyStatus}
          />
        </div>

        <CallManagerTopTabs
          canAccessAdmin={props.canAccessAdmin}
          derived={props.derived}
          handlers={props.handlers}
          mutations={props.mutations}
          queries={props.queries}
          queueStats={props.queueStats}
          scenarioDescriptions={props.scenarioDescriptions}
          state={props.state}
          toast={props.toast}
        />
      </div>

      <CallManagerDialogs
        callToDelete={props.state.callToDelete}
        contextUpdateTrigger={props.state.contextUpdateTrigger}
        currentColors={props.currentColors}
        deleteCallIsPending={props.mutations.deleteCallMutation.isPending}
        isCallDialogOpen={props.state.isCallDialogOpen}
        isDeleteDialogOpen={props.state.isDeleteDialogOpen}
        isNukeCallDataDialogOpen={props.state.isNukeCallDataDialogOpen}
        isNukeDialogOpen={props.state.isNukeDialogOpen}
        nukeAnalysisIsPending={props.mutations.nukeAnalysisMutation.isPending}
        nukeCallDataIsPending={props.mutations.nukeCallDataMutation.isPending}
        onCallDialogOpenChange={props.state.setIsCallDialogOpen}
        onCancelDeleteCall={() => {
          props.state.setIsDeleteDialogOpen(false);
          props.state.setCallToDelete(null);
        }}
        onConfirmDeleteCall={() => {
          if (props.state.callToDelete) {
            props.mutations.deleteCallMutation.mutate(props.state.callToDelete);
          }
        }}
        onConfirmNukeAnalysis={() => props.mutations.nukeAnalysisMutation.mutate()}
        onConfirmNukeCallData={() => props.mutations.nukeCallDataMutation.mutate()}
        onDeleteDialogOpenChange={props.state.setIsDeleteDialogOpen}
        onNukeCallDataDialogOpenChange={props.state.setIsNukeCallDataDialogOpen}
        onNukeDialogOpenChange={props.state.setIsNukeDialogOpen}
        onSetContextUpdateTrigger={props.state.setContextUpdateTrigger}
        onStoreDetailsDialogOpenChange={(open: boolean) => {
          if (!open) props.state.setStoreDetailsDialog(null);
        }}
        refetchAnalytics={props.queries.refetchAnalytics}
        selectedCallForDialog={props.state.selectedCallForDialog}
        statusColors={props.statusColors}
        statusOptions={props.statusOptions}
        storeDetailsDialog={props.state.storeDetailsDialog}
        storeSheetId={props.storeSheetId}
        trackerSheetId={props.trackerSheetId}
      />
    </div>
  );
}
