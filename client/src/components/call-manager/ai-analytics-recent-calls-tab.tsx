import { Calendar, Clock, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type AiAnalyticsRecentCallsTabProps = {
  analyticsLoading: boolean;
  filteredAnalyticsData: any;
  onDeleteCall: (callId: string) => void;
  onViewTranscript: (call: any) => void;
};

export function AiAnalyticsRecentCallsTab({
  analyticsLoading,
  filteredAnalyticsData,
  onDeleteCall,
  onViewTranscript,
}: AiAnalyticsRecentCallsTabProps) {
  return (
    <>
      {analyticsLoading ? (
        <div className="flex justify-center py-12" data-testid="loading-recent-calls">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredAnalyticsData && filteredAnalyticsData.calls.length > 0 ? (
        <ScrollArea className="h-[600px]" data-testid="scroll-recent-calls">
          <div className="space-y-4 pr-4">
            {filteredAnalyticsData.calls.map((call: any) => {
              const getInterestBadgeVariant = (level: string | null) => {
                if (!level) return { variant: "outline" as const, className: "" };
                switch (level) {
                  case "hot":
                    return { variant: "default" as const, className: "bg-red-600" };
                  case "warm":
                    return { variant: "default" as const, className: "bg-orange-600" };
                  case "cold":
                    return { variant: "default" as const, className: "bg-blue-600" };
                  case "not-interested":
                    return { variant: "outline" as const, className: "" };
                  default:
                    return { variant: "outline" as const, className: "" };
                }
              };

              const interestBadge = getInterestBadgeVariant(call.session.interestLevel);
              const storeName = call.client.data?.Name || call.client.uniqueIdentifier || "Unknown Store";

              return (
                <Card key={call.session.id} data-testid={`card-call-${call.session.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base" data-testid={`text-store-${call.session.id}`}>
                          {storeName}
                        </CardTitle>
                        <CardDescription data-testid={`text-phone-${call.session.id}`}>
                          {call.session.phoneNumber}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {call.session.callSuccessful ? (
                          <Badge variant="default" className="bg-green-600" data-testid={`badge-success-${call.session.id}`}>
                            Success
                          </Badge>
                        ) : (
                          <Badge variant="destructive" data-testid={`badge-failed-${call.session.id}`}>
                            Failed
                          </Badge>
                        )}
                        {call.session.interestLevel && (
                          <Badge
                            variant={interestBadge.variant}
                            className={interestBadge.className}
                            data-testid={`badge-interest-${call.session.id}`}
                          >
                            {call.session.interestLevel}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => onDeleteCall(call.session.id)}
                          data-testid={`button-delete-${call.session.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1" data-testid={`text-date-${call.session.id}`}>
                        <Calendar className="h-3 w-3" />
                        {new Date(call.session.startedAt).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1" data-testid={`text-duration-${call.session.id}`}>
                        <Clock className="h-3 w-3" />
                        {(() => {
                          const mins = Math.floor(call.session.callDurationSecs / 60);
                          const secs = Math.floor(call.session.callDurationSecs % 60);
                          return `${mins}:${secs.toString().padStart(2, "0")}`;
                        })()}
                      </div>
                    </div>
                    {call.session.aiAnalysis?.summary && (
                      <p
                        className="text-sm line-clamp-2"
                        data-testid={`text-summary-${call.session.id}`}
                      >
                        {call.session.aiAnalysis.summary}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewTranscript(call)}
                      data-testid={`button-transcript-${call.session.id}`}
                    >
                      View Transcript
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-12 bg-muted/20 rounded-lg">
          <p className="text-muted-foreground" data-testid="text-no-recent-calls">
            No recent calls to display
          </p>
        </div>
      )}
    </>
  );
}
