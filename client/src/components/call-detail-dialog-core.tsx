import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StoreDetailsDialog } from "@/components/store-details-dialog";
import { CallDetailDialogProps, TranscriptResponse } from "./call-detail-dialog/types";
import { formatDuration, getInterestLevelColor, getInterestLevelLabel, getSentimentColor } from "./call-detail-dialog/utils";
import { CallDetailHeader } from "./call-detail-dialog/header";
import { TranscriptTab } from "./call-detail-dialog/transcript-tab";
import { SummaryTab } from "./call-detail-dialog/summary-tab";
import { DetailsTab } from "./call-detail-dialog/details-tab";

export function CallDetailDialog({
  open,
  onOpenChange,
  conversationId,
  callData,
  trackerSheetId,
  storeSheetId,
  refetch,
  currentColors,
  statusOptions = [],
  statusColors = {},
  contextUpdateTrigger = 0,
  setContextUpdateTrigger,
}: CallDetailDialogProps) {
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [loadDefaultScriptTrigger] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transcriptData, isLoading } = useQuery<TranscriptResponse>({
    queryKey: ["/api/elevenlabs/call-transcript", conversationId],
    enabled: open && !!conversationId,
  });

  const analyzeMutation = useMutation({
    mutationFn: async (callSessionId: string) => {
      const response = await fetch(`/api/calls/${callSessionId}/analyze`, { method: "POST", credentials: "include" });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Analysis failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Analysis Complete", description: `Score: ${data.score} - ${data.qualificationResult}` });
      queryClient.invalidateQueries({ queryKey: ["/api/elevenlabs/call-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/qualification/leads"] });
      refetch?.();
    },
    onError: (error: Error) => {
      toast({ title: "Analysis Failed", description: error.message, variant: "destructive" });
    },
  });

  const transcripts = transcriptData?.transcripts || [];
  const session = callData?.session;
  const client = callData?.client;
  const storeName = client?.data?.businessName || client?.data?.storeName || "Unknown Store";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col" data-testid="dialog-call-detail">
          <CallDetailHeader
            session={session}
            storeName={storeName}
            analyzePending={analyzeMutation.isPending}
            onAnalyze={() => session?.id && analyzeMutation.mutate(session.id)}
          />

          <Tabs defaultValue="transcript" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3" data-testid="tabs-call-detail">
              <TabsTrigger value="transcript" data-testid="tab-transcript">
                Transcript
                {callData && (
                  <Badge variant="secondary" className="ml-2">
                    {callData.transcriptCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="summary" data-testid="tab-summary">
                AI Summary
              </TabsTrigger>
              <TabsTrigger value="details" data-testid="tab-details">
                Details
              </TabsTrigger>
            </TabsList>
            <TranscriptTab isLoading={isLoading} transcripts={transcripts} formatDuration={formatDuration} />
            <SummaryTab session={session} getSentimentColor={getSentimentColor} />
            <DetailsTab
              session={session}
              client={client}
              formatDuration={formatDuration}
              getInterestLevelColor={getInterestLevelColor}
              getInterestLevelLabel={getInterestLevelLabel}
              onOpenStore={() => setStoreDialogOpen(true)}
            />
          </Tabs>
        </DialogContent>
      </Dialog>

      {client?.data && trackerSheetId && storeSheetId && (
        <StoreDetailsDialog
          open={storeDialogOpen}
          onOpenChange={setStoreDialogOpen}
          row={client.data}
          trackerSheetId={trackerSheetId}
          storeSheetId={storeSheetId}
          refetch={refetch || (async () => {})}
          currentColors={currentColors || {}}
          statusOptions={statusOptions}
          statusColors={statusColors}
          contextUpdateTrigger={contextUpdateTrigger}
          setContextUpdateTrigger={setContextUpdateTrigger || (() => {})}
          loadDefaultScriptTrigger={loadDefaultScriptTrigger}
        />
      )}
    </>
  );
}
