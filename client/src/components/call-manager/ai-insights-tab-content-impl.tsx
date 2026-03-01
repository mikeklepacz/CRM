import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TabsContent } from "@/components/ui/tabs";
import { Brain, BarChart3, Bomb, CheckCircle2, Loader2 } from "lucide-react";
import { AiInsightsProgressBubbles } from "@/components/call-manager/ai-insights-progress-bubbles";
import { AiInsightsHistoricalTrendsCard } from "@/components/call-manager/ai-insights-historical-trends-card";
import { AiInsightsPatternCards } from "@/components/call-manager/ai-insights-pattern-cards";
import { AiInsightsViewModeToggle } from "@/components/call-manager/ai-insights-view-mode-toggle";
import { AiInsightsAllTimeSummary } from "@/components/call-manager/ai-insights-all-time-summary";
import { AiInsightsSentimentRecommendations } from "@/components/call-manager/ai-insights-sentiment-recommendations";

interface AiInsightsTabContentProps {
  agents: Array<{ id: string; name: string }>;
  alignerCallCount: number;
  alignerError: string | null;
  alignerKbFileCount: number;
  alignerStatus: "idle" | "running" | "complete" | "error";
  allTimeSummary: any;
  analyzeCallsMutation: any;
  canAccessAdmin: boolean;
  filteredAnalyticsData: any;
  insightsAgentFilter: string;
  insightsDateRange: "7days" | "30days" | "custom";
  insightsEndDate: string;
  insightsHistory: any;
  insightsStartDate: string;
  insightsViewMode: "individual" | "all-time";
  loadHistoricalInsight: (insight: any) => void;
  onAnalyzeCalls: () => void;
  onAutoKbAnalysisChange: (checked: boolean) => void;
  onKbAnalysisThresholdChange: (value: number) => void;
  onOpenCallDialog: (conversationId: string, callData: any) => void;
  onOpenNukeDialog: () => void;
  onResetSelectedInsight: () => void;
  onSetInsightsAgentFilter: (value: string) => void;
  onSetInsightsDateRange: (value: "7days" | "30days" | "custom") => void;
  onSetInsightsEndDate: (value: string) => void;
  onSetInsightsStartDate: (value: string) => void;
  onSetInsightsViewMode: (value: "individual" | "all-time") => void;
  persistedInsights: any;
  preferences: any;
  selectedInsightId: string | null;
  updatePreferencesMutation: any;
  wickCoachCallCount: number;
  wickCoachError: string | null;
  wickCoachStatus: "idle" | "running" | "complete" | "error";
}

export function AiInsightsTabContent({
  agents,
  alignerCallCount,
  alignerError,
  alignerKbFileCount,
  alignerStatus,
  allTimeSummary,
  analyzeCallsMutation,
  canAccessAdmin,
  filteredAnalyticsData,
  insightsAgentFilter,
  insightsDateRange,
  insightsEndDate,
  insightsHistory,
  insightsStartDate,
  insightsViewMode,
  loadHistoricalInsight,
  onAnalyzeCalls,
  onAutoKbAnalysisChange,
  onKbAnalysisThresholdChange,
  onOpenCallDialog,
  onOpenNukeDialog,
  onResetSelectedInsight,
  onSetInsightsAgentFilter,
  onSetInsightsDateRange,
  onSetInsightsEndDate,
  onSetInsightsStartDate,
  onSetInsightsViewMode,
  persistedInsights,
  preferences,
  selectedInsightId,
  updatePreferencesMutation,
  wickCoachCallCount,
  wickCoachError,
  wickCoachStatus,
}: AiInsightsTabContentProps) {
  return (
    <TabsContent value="ai-insights" className="space-y-6">
      {/* AI Insights Section */}
      <Card data-testid="card-ai-insights">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="text-ai-insights-title">
            <Brain className="h-5 w-5" />
            AI Insights
          </CardTitle>
          <CardDescription data-testid="text-ai-insights-description">
            Analyze call patterns, objections, and success factors using AI-powered analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-4">
            {/* NUKE Button */}
            <Button
              variant="destructive"
              onClick={onOpenNukeDialog}
              className="h-10"
              data-testid="button-nuke-analysis"
            >
              <Bomb className="h-4 w-4 mr-2" />
              NUKE
            </Button>

            <div className="space-y-2">
              <Label htmlFor="insights-date-range">Date Range</Label>
              <Select
                value={insightsDateRange}
                onValueChange={(value: "7days" | "30days" | "custom") => onSetInsightsDateRange(value)}
              >
                <SelectTrigger id="insights-date-range" className="w-[180px]" data-testid="select-insights-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {insightsDateRange === "custom" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="insights-start-date">Start Date</Label>
                  <Input
                    id="insights-start-date"
                    type="date"
                    value={insightsStartDate}
                    onChange={(e) => onSetInsightsStartDate(e.target.value)}
                    data-testid="input-insights-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insights-end-date">End Date</Label>
                  <Input
                    id="insights-end-date"
                    type="date"
                    value={insightsEndDate}
                    onChange={(e) => onSetInsightsEndDate(e.target.value)}
                    data-testid="input-insights-end-date"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="insights-agent-filter">AI Agent</Label>
              <Select value={insightsAgentFilter} onValueChange={onSetInsightsAgentFilter}>
                <SelectTrigger id="insights-agent-filter" className="w-[200px]" data-testid="select-insights-agent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {agents?.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={onAnalyzeCalls} disabled={analyzeCallsMutation.isPending} data-testid="button-analyze-calls">
              {analyzeCallsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analyze Calls
                </>
              )}
            </Button>

            {canAccessAdmin && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="auto-kb-analysis"
                  checked={preferences?.autoKbAnalysis || false}
                  onCheckedChange={(checked) => {
                    onAutoKbAnalysisChange(checked === true);
                  }}
                  data-testid="checkbox-auto-kb-analysis"
                />
                <Label htmlFor="auto-kb-analysis" className="text-sm cursor-pointer">
                  Auto-trigger
                </Label>
                {preferences?.autoKbAnalysis && (
                  <>
                    <span className="text-xs text-muted-foreground">after</span>
                    <Input
                      id="kb-analysis-threshold"
                      type="number"
                      min="1"
                      max="100"
                      value={preferences?.kbAnalysisThreshold || 10}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value >= 1 && value <= 100) {
                          onKbAnalysisThresholdChange(value);
                        }
                      }}
                      className="w-16 h-8"
                      data-testid="input-kb-analysis-threshold"
                    />
                    <span className="text-xs text-muted-foreground">calls</span>
                  </>
                )}
              </div>
            )}
          </div>

          <AiInsightsProgressBubbles
            alignerCallCount={alignerCallCount}
            alignerError={alignerError}
            alignerKbFileCount={alignerKbFileCount}
            alignerStatus={alignerStatus}
            wickCoachCallCount={wickCoachCallCount}
            wickCoachError={wickCoachError}
            wickCoachStatus={wickCoachStatus}
          />

          <AiInsightsHistoricalTrendsCard
            insightsHistory={insightsHistory}
            selectedInsightId={selectedInsightId}
            onLoadHistoricalInsight={loadHistoricalInsight}
          />

          <AiInsightsViewModeToggle
            hasHistory={!!(insightsHistory && insightsHistory.length > 0)}
            hasPersistedInsights={!!persistedInsights}
            insightsViewMode={insightsViewMode}
            onInsightsViewModeChange={onSetInsightsViewMode}
            onResetSelectedInsight={onResetSelectedInsight}
          />

          {/* Insights Results */}
          {persistedInsights && insightsViewMode === "individual" && (
            <div className="space-y-6 mt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Analysis completed for {persistedInsights.callCount} calls
              </div>

              <AiInsightsPatternCards
                filteredAnalyticsData={filteredAnalyticsData}
                persistedInsights={persistedInsights}
                onOpenCallDialog={onOpenCallDialog}
              />

              <AiInsightsSentimentRecommendations persistedInsights={persistedInsights} />
            </div>
          )}

          <AiInsightsAllTimeSummary allTimeSummary={allTimeSummary} insightsViewMode={insightsViewMode} />

          {/* Empty State */}
          {!persistedInsights && !analyzeCallsMutation.isPending && (
            <div className="text-center py-12 bg-muted/20 rounded-lg">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground" data-testid="text-no-insights">
                Select filters and click "Analyze Calls" to generate AI-powered insights
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
