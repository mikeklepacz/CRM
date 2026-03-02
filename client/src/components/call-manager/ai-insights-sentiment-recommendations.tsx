import { BarChart3, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AiInsightsSentimentRecommendationsProps = {
  persistedInsights: any;
};

export function AiInsightsSentimentRecommendations({
  persistedInsights,
}: AiInsightsSentimentRecommendationsProps) {
  return (
    <>
      {persistedInsights.sentimentAnalysis && (
        <Card data-testid="card-sentiment-analysis">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Sentiment Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {persistedInsights.sentimentAnalysis.positive}%
                </div>
                <p className="text-sm text-muted-foreground">Positive</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {persistedInsights.sentimentAnalysis.neutral}%
                </div>
                <p className="text-sm text-muted-foreground">Neutral</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {persistedInsights.sentimentAnalysis.negative}%
                </div>
                <p className="text-sm text-muted-foreground">Negative</p>
              </div>
            </div>
            {persistedInsights.sentimentAnalysis.trends && (
              <p className="text-sm text-muted-foreground border-t pt-4">
                {persistedInsights.sentimentAnalysis.trends}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {persistedInsights.coachingRecommendations && persistedInsights.coachingRecommendations.length > 0 && (
        <Card data-testid="card-coaching-recommendations">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Coaching Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {persistedInsights.coachingRecommendations.map((rec: any, idx: number) => (
                <div key={idx} className="border rounded-lg p-4" data-testid={`recommendation-${idx}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-medium">{rec.title}</p>
                    <Badge
                      variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "default" : "secondary"}
                      data-testid={`recommendation-priority-${idx}`}
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
    </>
  );
}
