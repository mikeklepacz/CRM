import { MessageSquare, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AiInsightsPatternCardsProps = {
  filteredAnalyticsData: any;
  persistedInsights: any;
  onOpenCallDialog: (conversationId: string, callData: any) => void;
};

export function AiInsightsPatternCards({
  filteredAnalyticsData,
  persistedInsights,
  onOpenCallDialog,
}: AiInsightsPatternCardsProps) {
  return (
    <>
      {persistedInsights.commonObjections && persistedInsights.commonObjections.length > 0 && (
        <Card data-testid="card-common-objections">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5" />
              Common Objections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {persistedInsights.commonObjections.map((objection: any, idx: number) => (
                <div key={idx} className="border rounded-lg p-4" data-testid={`objection-${idx}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{objection.objection}</p>
                    <Badge variant="secondary" data-testid={`objection-frequency-${idx}`}>
                      {objection.frequency}x
                    </Badge>
                  </div>
                  {objection.exampleConversations && objection.exampleConversations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-xs text-muted-foreground">Examples:</span>
                      {objection.exampleConversations.slice(0, 3).map((example: any, exIdx: number) => (
                        <Badge
                          key={exIdx}
                          variant="outline"
                          className="cursor-pointer hover-elevate text-xs"
                          onClick={() => {
                            const callData = filteredAnalyticsData?.calls.find(
                              (call: any) => call.session.conversationId === example.conversationId
                            ) || null;
                            onOpenCallDialog(example.conversationId, callData);
                          }}
                          data-testid={`example-badge-${idx}-${exIdx}`}
                        >
                          {example.duration ? `${Math.floor(example.duration / 60)}:${String(example.duration % 60).padStart(2, "0")}` : ""} {example.storeName}{example.city && example.state ? `, ${example.city}, ${example.state}` : ""}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {persistedInsights.successPatterns && persistedInsights.successPatterns.length > 0 && (
        <Card data-testid="card-success-patterns">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Success Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {persistedInsights.successPatterns.map((pattern: any, idx: number) => (
                <div key={idx} className="border rounded-lg p-4" data-testid={`pattern-${idx}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{pattern.pattern}</p>
                    <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
                      {pattern.frequency}x
                    </Badge>
                  </div>
                  {pattern.exampleConversations && pattern.exampleConversations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-xs text-muted-foreground">Examples:</span>
                      {pattern.exampleConversations.slice(0, 3).map((example: any, exIdx: number) => (
                        <Badge
                          key={exIdx}
                          variant="outline"
                          className="cursor-pointer hover-elevate text-xs"
                          onClick={() => {
                            const callData = filteredAnalyticsData?.calls.find(
                              (call: any) => call.session.conversationId === example.conversationId
                            ) || null;
                            onOpenCallDialog(example.conversationId, callData);
                          }}
                          data-testid={`pattern-example-badge-${idx}-${exIdx}`}
                        >
                          {example.duration ? `${Math.floor(example.duration / 60)}:${String(example.duration % 60).padStart(2, "0")}` : ""} {example.storeName}{example.city && example.state ? `, ${example.city}, ${example.state}` : ""}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
