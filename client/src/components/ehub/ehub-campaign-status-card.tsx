import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EhubCampaignStatusCardProps = {
  selectedSequenceId: string | null;
  sequences: any[] | undefined;
  stepDelays: number[];
  strategyTranscript: any;
  updatePending: boolean;
  onInvalidActivate: (description: string) => void;
  onUpdateStatus: (status: "active" | "draft") => void;
};

export function EhubCampaignStatusCard({
  selectedSequenceId,
  sequences,
  stepDelays,
  strategyTranscript,
  updatePending,
  onInvalidActivate,
  onUpdateStatus,
}: EhubCampaignStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sequences && selectedSequenceId && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Current Status:</span>
                <Badge
                  variant={
                    sequences?.find((s) => s.id === selectedSequenceId)?.status === "active"
                      ? "default"
                      : "secondary"
                  }
                  data-testid="badge-sequence-status"
                >
                  {sequences?.find((s) => s.id === selectedSequenceId)?.status || "draft"}
                </Badge>
              </div>

              {strategyTranscript?.lastUpdatedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Last Updated:</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(strategyTranscript.lastUpdatedAt).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Step Delays:</span>
                <span className="text-sm text-muted-foreground">
                  {stepDelays.length} step{stepDelays.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Strategy Messages:</span>
                <span className="text-sm text-muted-foreground">
                  {strategyTranscript?.messages?.length || 0} message{strategyTranscript?.messages?.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="pt-2">
              {(() => {
                const currentStatus = sequences?.find((s) => s.id === selectedSequenceId)?.status || "draft";
                const currentSequence = sequences?.find((s) => s.id === selectedSequenceId);
                const hasCampaignBrief = !!(currentSequence as any)?.finalizedStrategy?.trim();
                const hasMessages = strategyTranscript?.messages && strategyTranscript.messages.length > 0;
                const hasValidDelays = stepDelays.length > 0 && stepDelays.every((d) => d >= 0);
                const canActivate = hasCampaignBrief && hasMessages && hasValidDelays;

                return currentStatus === "active" ? (
                  <Button
                    variant="outline"
                    onClick={() => onUpdateStatus("draft")}
                    disabled={updatePending}
                    data-testid="button-deactivate-sequence"
                    className="w-full"
                  >
                    {updatePending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Deactivate Campaign
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        const sequenceForActivate = sequences?.find((s) => s.id === selectedSequenceId);
                        const hasBrief = !!(sequenceForActivate as any)?.finalizedStrategy?.trim();
                        const hasMsgs = strategyTranscript?.messages && strategyTranscript.messages.length > 0;
                        const hasAscendingDelays = stepDelays.length > 0 && stepDelays.every((d) => d >= 0) &&
                          stepDelays.every((d, i) => i === 0 || d > stepDelays[i - 1]);

                        if (!hasBrief) {
                          onInvalidActivate("Campaign Brief is required. Complete 'Finalize Strategy' in the Strategy tab first.");
                          return;
                        }

                        if (!hasMsgs) {
                          onInvalidActivate("Add at least one strategy message before activating");
                          return;
                        }

                        if (!hasAscendingDelays) {
                          onInvalidActivate("Configure valid step delays (non-negative, ascending) before activating");
                          return;
                        }

                        onUpdateStatus("active");
                      }}
                      disabled={!canActivate || updatePending}
                      data-testid="button-activate-sequence"
                      className="w-full"
                    >
                      {updatePending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Activate Campaign
                    </Button>
                    {!canActivate && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {!hasCampaignBrief && "Complete 'Finalize Strategy' first. "}
                          {!hasMessages && "Add at least one strategy message. "}
                          {!hasValidDelays && "Configure valid step delays (non-negative, ascending)."}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
