import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiAnalyticsHeader } from "@/components/call-manager/ai-analytics-header";
import { AnalyticsFilters } from "@/components/call-manager/analytics-filters";
import { AiAnalyticsDashboardTab } from "@/components/call-manager/ai-analytics-dashboard-tab";
import { AiAnalyticsRecentCallsTab } from "@/components/call-manager/ai-analytics-recent-calls-tab";

interface AiAnalyticsTabContentProps {
  agents: any[];
  analyticsAgentFilter: string;
  analyticsDateFilter: string;
  analyticsInterestFilter: string;
  analyticsLoading: boolean;
  analyticsStatusFilter: string;
  filteredAnalyticsData: any;
  onAgentFilterChange: (value: string) => void;
  onDateFilterChange: (value: string) => void;
  onDeleteCall: (callId: string) => void;
  onInterestFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSync: () => void;
  onViewTranscript: (call: any) => void;
  syncingCalls: boolean;
}

export function AiAnalyticsTabContent({
  agents,
  analyticsAgentFilter,
  analyticsDateFilter,
  analyticsInterestFilter,
  analyticsLoading,
  analyticsStatusFilter,
  filteredAnalyticsData,
  onAgentFilterChange,
  onDateFilterChange,
  onDeleteCall,
  onInterestFilterChange,
  onStatusFilterChange,
  onSync,
  onViewTranscript,
  syncingCalls,
}: AiAnalyticsTabContentProps) {
  return (
    <TabsContent value="ai-analytics" className="space-y-6">
      {/* AI Call Analytics Section */}
      <Card data-testid="card-ai-analytics">
        <AiAnalyticsHeader onSync={onSync} syncingCalls={syncingCalls} />
        <CardContent>
          <AnalyticsFilters
            agents={agents}
            analyticsAgentFilter={analyticsAgentFilter}
            analyticsDateFilter={analyticsDateFilter}
            analyticsInterestFilter={analyticsInterestFilter}
            analyticsStatusFilter={analyticsStatusFilter}
            onAgentFilterChange={onAgentFilterChange}
            onDateFilterChange={onDateFilterChange}
            onInterestFilterChange={onInterestFilterChange}
            onStatusFilterChange={onStatusFilterChange}
          />

          <Tabs defaultValue="dashboard" data-testid="tabs-analytics">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dashboard" data-testid="tab-dashboard">
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="recent-calls" data-testid="tab-recent-calls">
                Recent Calls
              </TabsTrigger>
            </TabsList>

            <AiAnalyticsDashboardTab
              analyticsLoading={analyticsLoading}
              filteredAnalyticsData={filteredAnalyticsData}
            />

            <TabsContent value="recent-calls" className="mt-6">
              <AiAnalyticsRecentCallsTab
                analyticsLoading={analyticsLoading}
                filteredAnalyticsData={filteredAnalyticsData}
                onDeleteCall={onDeleteCall}
                onViewTranscript={onViewTranscript}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
