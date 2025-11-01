import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PhoneCall, Clock, Loader2, Calendar, TrendingUp, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CallDetailDialog } from "@/components/call-detail-dialog";
import { format } from "date-fns";

interface ElevenLabsAgent {
  id: string;
  agent_id: string;
  name: string;
  phone_number_id: string;
}

interface CallSession {
  id: string;
  conversationId: string;
  agentId: string;
  clientId: string;
  phoneNumber: string;
  status: string;
  callDurationSecs: number;
  startedAt: string;
  endedAt: string;
  aiAnalysis: {
    summary?: string;
    sentiment?: string;
    customerMood?: string;
    mainObjection?: string;
    keyMoment?: string;
    agentStrengths?: string;
    lessonLearned?: string;
  } | null;
  callSuccessful: boolean;
  interestLevel: 'hot' | 'warm' | 'cold' | 'not-interested' | null;
}

interface CallClient {
  id: string;
  uniqueIdentifier: string;
  data: any;
}

interface CallRecord {
  session: CallSession;
  client: CallClient;
  transcriptCount: number;
}

interface CallAnalyticsMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgDurationSecs: number;
  interestLevels: {
    hot: number;
    warm: number;
    cold: number;
    notInterested: number;
  };
}

interface CallAnalyticsData {
  calls: CallRecord[];
  metrics: CallAnalyticsMetrics;
}

export function AICallAnalytics() {
  const [analyticsAgentFilter, setAnalyticsAgentFilter] = useState<string>("all");
  const [analyticsDateFilter, setAnalyticsDateFilter] = useState<string>("all");
  const [analyticsStatusFilter, setAnalyticsStatusFilter] = useState<string>("all");
  const [analyticsInterestFilter, setAnalyticsInterestFilter] = useState<string>("all");
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [selectedCallForDialog, setSelectedCallForDialog] = useState<{ conversationId: string; callData: any } | null>(null);

  // Fetch available agents
  const { data: agents = [] } = useQuery<ElevenLabsAgent[]>({
    queryKey: ['/api/elevenlabs/agents'],
  });

  // Fetch call analytics
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<CallAnalyticsData>({
    queryKey: ['/api/elevenlabs/call-analytics'],
  });

  // Filter analytics data based on selected filters
  const filteredAnalyticsData = useMemo(() => {
    if (!analyticsData) return { calls: [], metrics: analyticsData?.metrics || {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      avgDurationSecs: 0,
      interestLevels: { hot: 0, warm: 0, cold: 0, notInterested: 0 }
    }};

    let filteredCalls = [...analyticsData.calls];

    // Filter by agent
    if (analyticsAgentFilter !== "all") {
      filteredCalls = filteredCalls.filter(call => call.session.agentId === analyticsAgentFilter);
    }

    // Filter by date
    if (analyticsDateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();
      
      if (analyticsDateFilter === "today") {
        filterDate.setHours(0, 0, 0, 0);
      } else if (analyticsDateFilter === "7days") {
        filterDate.setDate(now.getDate() - 7);
      } else if (analyticsDateFilter === "30days") {
        filterDate.setDate(now.getDate() - 30);
      }
      
      filteredCalls = filteredCalls.filter(call => new Date(call.session.startedAt) >= filterDate);
    }

    // Filter by status
    if (analyticsStatusFilter !== "all") {
      filteredCalls = filteredCalls.filter(call => 
        analyticsStatusFilter === "successful" ? call.session.callSuccessful : !call.session.callSuccessful
      );
    }

    // Filter by interest level
    if (analyticsInterestFilter !== "all") {
      filteredCalls = filteredCalls.filter(call => call.session.interestLevel === analyticsInterestFilter);
    }

    // Recalculate metrics based on filtered calls
    const metrics: CallAnalyticsMetrics = {
      totalCalls: filteredCalls.length,
      successfulCalls: filteredCalls.filter(c => c.session.callSuccessful).length,
      failedCalls: filteredCalls.filter(c => !c.session.callSuccessful).length,
      avgDurationSecs: filteredCalls.length > 0 
        ? Math.round(filteredCalls.reduce((sum, c) => sum + c.session.callDurationSecs, 0) / filteredCalls.length)
        : 0,
      interestLevels: {
        hot: filteredCalls.filter(c => c.session.interestLevel === 'hot').length,
        warm: filteredCalls.filter(c => c.session.interestLevel === 'warm').length,
        cold: filteredCalls.filter(c => c.session.interestLevel === 'cold').length,
        notInterested: filteredCalls.filter(c => c.session.interestLevel === 'not-interested').length,
      }
    };

    return { calls: filteredCalls, metrics };
  }, [analyticsData, analyticsAgentFilter, analyticsDateFilter, analyticsStatusFilter, analyticsInterestFilter]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getInterestBadgeVariant = (level: string | null) => {
    if (!level) return { variant: 'outline' as const, className: '' };
    switch (level) {
      case 'hot':
        return { variant: 'default' as const, className: 'bg-red-600' };
      case 'warm':
        return { variant: 'default' as const, className: 'bg-orange-600' };
      case 'cold':
        return { variant: 'default' as const, className: 'bg-blue-600' };
      case 'not-interested':
        return { variant: 'outline' as const, className: '' };
      default:
        return { variant: 'outline' as const, className: '' };
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-semibold">AI Call Analytics</h2>
        <p className="text-muted-foreground">Insights from your AI-powered calls</p>
      </div>

      {/* Analytics Filters */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/20 rounded-lg" data-testid="analytics-filters">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="analytics-agent-filter" className="text-sm font-medium">AI Agent</Label>
          <Select value={analyticsAgentFilter} onValueChange={setAnalyticsAgentFilter}>
            <SelectTrigger id="analytics-agent-filter" data-testid="select-analytics-agent">
              <SelectValue placeholder="All Agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.agent_id} value={agent.agent_id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="analytics-date-filter" className="text-sm font-medium">Date Range</Label>
          <Select value={analyticsDateFilter} onValueChange={setAnalyticsDateFilter}>
            <SelectTrigger id="analytics-date-filter" data-testid="select-analytics-date">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="analytics-status-filter" className="text-sm font-medium">Call Status</Label>
          <Select value={analyticsStatusFilter} onValueChange={setAnalyticsStatusFilter}>
            <SelectTrigger id="analytics-status-filter" data-testid="select-analytics-status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="successful">Successful</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="analytics-interest-filter" className="text-sm font-medium">Interest Level</Label>
          <Select value={analyticsInterestFilter} onValueChange={setAnalyticsInterestFilter}>
            <SelectTrigger id="analytics-interest-filter" data-testid="select-analytics-interest">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
              <SelectItem value="not-interested">Not Interested</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs for Dashboard and Recent Calls */}
      <Tabs defaultValue="dashboard" className="space-y-4" data-testid="tabs-analytics">
        <TabsList>
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="recent-calls" data-testid="tab-recent-calls">Recent Calls</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          {analyticsLoading ? (
            <div className="flex justify-center py-12" data-testid="loading-analytics">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAnalyticsData && filteredAnalyticsData.metrics.totalCalls > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="analytics-metrics">
              <Card data-testid="card-total-calls">
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

              <Card data-testid="card-success-rate">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-success-rate">
                    {filteredAnalyticsData.metrics.totalCalls > 0
                      ? Math.round((filteredAnalyticsData.metrics.successfulCalls / filteredAnalyticsData.metrics.totalCalls) * 100)
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {filteredAnalyticsData.metrics.successfulCalls} / {filteredAnalyticsData.metrics.totalCalls} successful
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-avg-duration">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-avg-duration">
                    {formatDuration(filteredAnalyticsData.metrics.avgDurationSecs)}
                  </div>
                  <p className="text-xs text-muted-foreground">Minutes:Seconds</p>
                </CardContent>
              </Card>

              <Card data-testid="card-interest-breakdown">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Interest Breakdown</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
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
          ) : (
            <div className="text-center py-12 bg-muted/20 rounded-lg">
              <p className="text-muted-foreground" data-testid="text-no-analytics">
                No analytics data available
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="recent-calls" className="mt-6">
          {analyticsLoading ? (
            <div className="flex justify-center py-12" data-testid="loading-recent-calls">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAnalyticsData && filteredAnalyticsData.calls.length > 0 ? (
            <ScrollArea className="h-[600px]" data-testid="scroll-recent-calls">
              <div className="space-y-4 pr-4">
                {filteredAnalyticsData.calls.map((call) => {
                  const interestBadgeProps = getInterestBadgeVariant(call.session.interestLevel);
                  const agentName = agents.find(a => a.agent_id === call.session.agentId)?.name || 'Unknown Agent';

                  return (
                    <Card 
                      key={call.session.id} 
                      className="hover-elevate cursor-pointer"
                      onClick={() => {
                        setSelectedCallForDialog({
                          conversationId: call.session.conversationId,
                          callData: call
                        });
                        setIsCallDialogOpen(true);
                      }}
                      data-testid={`card-call-${call.session.id}`}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-base">
                              {call.client.data.businessName || call.client.uniqueIdentifier}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <PhoneCall className="h-3 w-3" />
                              {call.session.phoneNumber}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge 
                              variant={call.session.callSuccessful ? "default" : "destructive"}
                              data-testid={`badge-status-${call.session.id}`}
                            >
                              {call.session.callSuccessful ? "Success" : "Failed"}
                            </Badge>
                            {call.session.interestLevel && (
                              <Badge {...interestBadgeProps} data-testid={`badge-interest-${call.session.id}`}>
                                {call.session.interestLevel}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(call.session.startedAt), 'MMM d, yyyy h:mm a')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(call.session.callDurationSecs)}
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Agent:</span> {agentName}
                        </div>
                        {call.session.aiAnalysis?.summary && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {call.session.aiAnalysis.summary}
                          </p>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-2"
                          data-testid={`button-view-details-${call.session.id}`}
                        >
                          View Full Details
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12 bg-muted/20 rounded-lg">
              <p className="text-muted-foreground" data-testid="text-no-calls">
                No call records available
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Call Detail Dialog */}
      {selectedCallForDialog && (
        <CallDetailDialog
          conversationId={selectedCallForDialog.conversationId}
          open={isCallDialogOpen}
          onOpenChange={setIsCallDialogOpen}
        />
      )}
    </div>
  );
}
