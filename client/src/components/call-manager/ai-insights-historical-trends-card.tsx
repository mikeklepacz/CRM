import { TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AiInsightsHistoricalTrendsCardProps = {
  insightsHistory: any[];
  selectedInsightId: string | null;
  onLoadHistoricalInsight: (insight: any) => void;
};

export function AiInsightsHistoricalTrendsCard({
  insightsHistory,
  selectedInsightId,
  onLoadHistoricalInsight,
}: AiInsightsHistoricalTrendsCardProps) {
  if (!insightsHistory || insightsHistory.length === 0) {
    return null;
  }

  return (
    <Card className="mt-6" data-testid="card-historical-trends">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Historical Trends
        </CardTitle>
        <CardDescription>
          Track improvements in AI agent performance over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Sentiment Trends</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={insightsHistory.slice().reverse().map((insight: any) => ({
                  date: new Date(insight.analyzedAt).toLocaleDateString(),
                  positive: insight.sentimentPositive || 0,
                  neutral: insight.sentimentNeutral || 0,
                  negative: insight.sentimentNegative || 0,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis
                  label={{ value: "Percentage", angle: -90, position: "insideLeft" }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend />
                <Line type="monotone" dataKey="positive" stroke="#22c55e" strokeWidth={2} name="Positive" />
                <Line type="monotone" dataKey="neutral" stroke="#eab308" strokeWidth={2} name="Neutral" />
                <Line type="monotone" dataKey="negative" stroke="#ef4444" strokeWidth={2} name="Negative" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Recent Analysis History</h4>
            <div className="space-y-2">
              {insightsHistory.slice(0, 5).map((insight: any, idx: number) => (
                <div
                  key={insight.id}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover-elevate ${
                    selectedInsightId === insight.id ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => onLoadHistoricalInsight(insight)}
                  data-testid={`historical-insight-${idx}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{new Date(insight.analyzedAt).toLocaleDateString()}</span>
                      <Badge variant="outline" className="text-xs">
                        {insight.callCount} calls
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="text-green-600">+{insight.sentimentPositive ?? 0}%</span>
                      <span className="text-yellow-600">~{insight.sentimentNeutral ?? 0}%</span>
                      <span className="text-red-600">-{insight.sentimentNegative ?? 0}%</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {insight.commonObjections?.length || 0} objections, {insight.successPatterns?.length || 0} patterns
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
