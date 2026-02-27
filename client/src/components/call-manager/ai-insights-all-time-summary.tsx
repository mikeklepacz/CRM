import { BarChart3, CheckCircle2, Lightbulb, MessageSquare, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AiInsightsAllTimeSummaryProps = {
  allTimeSummary: any;
  insightsViewMode: "individual" | "all-time";
};

export function AiInsightsAllTimeSummary({
  allTimeSummary,
  insightsViewMode,
}: AiInsightsAllTimeSummaryProps) {
  if (insightsViewMode !== "all-time" || !allTimeSummary) {
    return null;
  }

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        Aggregated across {allTimeSummary.analysisCount} analyses • {allTimeSummary.callCount} total calls
      </div>

      {allTimeSummary.commonObjections && allTimeSummary.commonObjections.length > 0 && (
        <Card data-testid="card-all-time-objections">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5" />
              Top Objections (All Time)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allTimeSummary.commonObjections.map((objection: any, idx: number) => (
                <div key={idx} className="border rounded-lg p-4" data-testid={`all-time-objection-${idx}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{objection.objection}</p>
                    <Badge variant="secondary" data-testid={`all-time-objection-frequency-${idx}`}>
                      {objection.frequency}x
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {allTimeSummary.successPatterns && allTimeSummary.successPatterns.length > 0 && (
        <Card data-testid="card-all-time-patterns">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Top Success Patterns (All Time)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allTimeSummary.successPatterns.map((pattern: any, idx: number) => (
                <div key={idx} className="border rounded-lg p-4" data-testid={`all-time-pattern-${idx}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{pattern.pattern}</p>
                    <Badge variant="secondary" data-testid={`all-time-pattern-frequency-${idx}`}>
                      {pattern.frequency}x
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {allTimeSummary.sentimentAnalysis && (
        <Card data-testid="card-all-time-sentiment">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Average Sentiment (All Time)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {allTimeSummary.sentimentAnalysis.positive}%
                </div>
                <p className="text-sm text-muted-foreground">Positive</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {allTimeSummary.sentimentAnalysis.neutral}%
                </div>
                <p className="text-sm text-muted-foreground">Neutral</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {allTimeSummary.sentimentAnalysis.negative}%
                </div>
                <p className="text-sm text-muted-foreground">Negative</p>
              </div>
            </div>
            {allTimeSummary.sentimentAnalysis.trends && (
              <p className="text-sm text-muted-foreground border-t pt-4">
                {allTimeSummary.sentimentAnalysis.trends}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {allTimeSummary.coachingRecommendations && allTimeSummary.coachingRecommendations.length > 0 && (
        <Card data-testid="card-all-time-recommendations">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Key Coaching Recommendations (All Time)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allTimeSummary.coachingRecommendations.map((rec: any, idx: number) => (
                <div key={idx} className="border rounded-lg p-4" data-testid={`all-time-recommendation-${idx}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-medium">{rec.title}</p>
                    <Badge
                      variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "default" : "secondary"}
                      data-testid={`all-time-recommendation-priority-${idx}`}
                    >
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
