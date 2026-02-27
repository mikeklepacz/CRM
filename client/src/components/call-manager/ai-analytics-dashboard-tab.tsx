import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Clock, Loader2, PhoneCall, TrendingDown, TrendingUp } from "lucide-react";

interface AiAnalyticsDashboardTabProps {
  analyticsLoading: boolean;
  filteredAnalyticsData: any;
}

export function AiAnalyticsDashboardTab({
  analyticsLoading,
  filteredAnalyticsData,
}: AiAnalyticsDashboardTabProps) {
  return (
    <TabsContent value="dashboard" className="mt-6">
      {analyticsLoading ? (
        <div className="flex justify-center py-12" data-testid="loading-analytics">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredAnalyticsData ? (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Calls */}
            <Card data-testid="card-metric-total">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                <PhoneCall className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-calls">
                  {filteredAnalyticsData.metrics.totalCalls}
                </div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            {/* Success Rate */}
            <Card data-testid="card-metric-success">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                {filteredAnalyticsData.metrics.totalCalls > 0 &&
                filteredAnalyticsData.metrics.successfulCalls / filteredAnalyticsData.metrics.totalCalls >= 0.5 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-success-rate">
                  {filteredAnalyticsData.metrics.totalCalls > 0
                    ? Math.round((filteredAnalyticsData.metrics.successfulCalls / filteredAnalyticsData.metrics.totalCalls) * 100)
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground">
                  {filteredAnalyticsData.metrics.successfulCalls} / {filteredAnalyticsData.metrics.totalCalls} successful
                </p>
              </CardContent>
            </Card>

            {/* Average Duration */}
            <Card data-testid="card-metric-duration">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-avg-duration">
                  {(() => {
                    const totalSecs = filteredAnalyticsData.metrics.avgDurationSecs;
                    const mins = Math.floor(totalSecs / 60);
                    const secs = Math.floor(totalSecs % 60);
                    return `${mins}:${secs.toString().padStart(2, "0")}`;
                  })()}
                </div>
                <p className="text-xs text-muted-foreground">Minutes:Seconds</p>
              </CardContent>
            </Card>

            {/* Interest Breakdown */}
            <Card data-testid="card-metric-interest">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Interest Breakdown</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2" data-testid="interest-breakdown">
                  <Badge variant="default" className="bg-red-600" data-testid="badge-hot">
                    Hot: {filteredAnalyticsData.metrics.interestLevels.hot}
                  </Badge>
                  <Badge variant="default" className="bg-orange-600" data-testid="badge-warm">
                    Warm: {filteredAnalyticsData.metrics.interestLevels.warm}
                  </Badge>
                  <Badge variant="default" className="bg-blue-600" data-testid="badge-cold">
                    Cold: {filteredAnalyticsData.metrics.interestLevels.cold}
                  </Badge>
                  <Badge variant="outline" data-testid="badge-not-interested">
                    Not Int: {filteredAnalyticsData.metrics.interestLevels.notInterested}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-muted/20 rounded-lg">
          <p className="text-muted-foreground" data-testid="text-no-analytics">
            No analytics data available
          </p>
        </div>
      )}
    </TabsContent>
  );
}
