import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VoiceHubQueueStats } from "@/components/call-manager/voice-hub-queue-stats";
import { VoiceHubBatchControlsCard } from "@/components/call-manager/voice-hub-batch-controls-card";
import { VoiceHubScenariosCard } from "@/components/call-manager/voice-hub-scenarios-card";
import { AiAnalyticsTabContent } from "@/components/call-manager/ai-analytics-tab-content";
import { AiInsightsTabContent } from "@/components/call-manager/ai-insights-tab-content";
import { CallManagerAdminTabs } from "@/components/call-manager/call-manager-admin-tabs";
import { CallHistoryTabContent } from "@/components/call-manager/call-history-tab-content";

export function CallManagerTopTabs(props: any) {
  return (
    <Tabs defaultValue="voice-hub" className="space-y-6">
      <TabsList>
        <TabsTrigger value="voice-hub" data-testid="tab-voice-hub">Voice Hub</TabsTrigger>
        <TabsTrigger value="ai-analytics" data-testid="tab-ai-analytics">AI Call Analytics</TabsTrigger>
        <TabsTrigger value="call-history" data-testid="tab-call-history">Call History</TabsTrigger>
        {props.canAccessAdmin && (
          <>
            <TabsTrigger value="ai-insights" data-testid="tab-ai-insights">AI Insights</TabsTrigger>
            <TabsTrigger value="aligner-chat" data-testid="tab-aligner-chat">Aligner Chat</TabsTrigger>
            <TabsTrigger value="kb-library" data-testid="tab-kb-library">KB Library</TabsTrigger>
            <TabsTrigger value="campaigns" data-testid="tab-campaigns">Campaigns</TabsTrigger>
          </>
        )}
      </TabsList>

      <TabsContent value="voice-hub" className="space-y-6">
        <VoiceHubQueueStats queueStats={props.queueStats} />
        <VoiceHubBatchControlsCard
          agents={props.queries.agents}
          agentsLoading={props.queries.agentsLoading}
          ivrBehavior={props.state.ivrBehavior}
          onBatchCall={props.handlers.handleBatchCall}
          onIvrBehaviorChange={props.state.setIvrBehavior}
          onScheduledTimeChange={props.state.setScheduledTime}
          onSchedulingModeChange={props.state.setSchedulingMode}
          onSelectedAgentChange={props.state.setSelectedAgent}
          schedulingMode={props.state.schedulingMode}
          scheduledTime={props.state.scheduledTime}
          selectedAgent={props.state.selectedAgent}
          selectedStoresSize={props.state.selectedStores.size}
          submitting={props.mutations.batchCallMutation.isPending}
        />
        <VoiceHubScenariosCard
          activeScenario={props.state.activeScenario}
          allStates={props.derived.allStates}
          eligibleStores={props.queries.eligibleStores}
          filteredStores={props.derived.filteredStores}
          handleSelectAll={props.handlers.handleSelectAll}
          handleStateChange={props.handlers.handleStateChange}
          handleToggleAgentFilter={props.handlers.handleToggleAgentFilter}
          handleToggleStore={props.handlers.handleToggleStore}
          isCanadianProvince={props.derived.isCanadianProvince}
          leadsCount={props.derived.leadsCount}
          onActiveScenarioChange={props.state.setActiveScenario}
          onSelectedStateFiltersChange={props.state.setSelectedStateFilters}
          onShowCanadaOnlyChange={props.state.setShowCanadaOnly}
          onSourceFilterChange={props.state.setSourceFilter}
          scenarioDescriptions={props.scenarioDescriptions}
          selectedAgentFilters={props.state.selectedAgentFilters}
          selectedStateFilters={props.state.selectedStateFilters}
          selectedStores={props.state.selectedStores}
          sheetsCount={props.derived.sheetsCount}
          showCanadaOnly={props.state.showCanadaOnly}
          sourceFilter={props.state.sourceFilter}
          stateCounts={props.derived.stateCounts}
          storesLoading={props.queries.storesLoading}
          uniqueAgents={props.derived.uniqueAgents}
        />
      </TabsContent>

      <AiAnalyticsTabContent
        agents={props.queries.agents}
        analyticsAgentFilter={props.state.analyticsAgentFilter}
        analyticsDateFilter={props.state.analyticsDateFilter}
        analyticsInterestFilter={props.state.analyticsInterestFilter}
        analyticsLoading={props.queries.analyticsLoading}
        analyticsStatusFilter={props.state.analyticsStatusFilter}
        filteredAnalyticsData={props.derived.filteredAnalyticsData}
        onAgentFilterChange={props.state.setAnalyticsAgentFilter}
        onDateFilterChange={props.state.setAnalyticsDateFilter}
        onDeleteCall={(callId: string) => {
          props.state.setCallToDelete(callId);
          props.state.setIsDeleteDialogOpen(true);
        }}
        onInterestFilterChange={props.state.setAnalyticsInterestFilter}
        onStatusFilterChange={props.state.setAnalyticsStatusFilter}
        onSync={props.handlers.handleSyncFromElevenLabs}
        onViewTranscript={(call: any) => {
          props.state.setSelectedCallForDialog({ conversationId: call.session.conversationId, callData: call });
          props.state.setIsCallDialogOpen(true);
        }}
        syncingCalls={props.state.syncingCalls}
      />

      {props.canAccessAdmin && (
        <AiInsightsTabContent
          agents={props.queries.agents}
          alignerCallCount={props.state.alignerCallCount}
          alignerError={props.state.alignerError}
          alignerKbFileCount={props.state.alignerKbFileCount}
          alignerStatus={props.state.alignerStatus}
          allTimeSummary={props.derived.allTimeSummary}
          analyzeCallsMutation={props.mutations.analyzeCallsMutation}
          canAccessAdmin={props.canAccessAdmin}
          filteredAnalyticsData={props.derived.filteredAnalyticsData}
          insightsAgentFilter={props.state.insightsAgentFilter}
          insightsDateRange={props.state.insightsDateRange}
          insightsEndDate={props.state.insightsEndDate}
          insightsHistory={props.queries.insightsHistory}
          insightsStartDate={props.state.insightsStartDate}
          insightsViewMode={props.state.insightsViewMode}
          loadHistoricalInsight={(insight: any) => {
            props.state.setPersistedInsights(insight);
            props.state.setSelectedInsightId(insight.id);
            props.state.setInsightsViewMode("individual");
          }}
          onAnalyzeCalls={() => props.mutations.analyzeCallsMutation.mutate()}
          onAutoKbAnalysisChange={(checked: boolean) => props.mutations.updatePreferencesMutation.mutate({ autoKbAnalysis: checked })}
          onKbAnalysisThresholdChange={(value: number) => props.mutations.updatePreferencesMutation.mutate({ kbAnalysisThreshold: value })}
          onOpenCallDialog={(conversationId: string, callData: any) => {
            props.state.setSelectedCallForDialog({ conversationId, callData });
            props.state.setIsCallDialogOpen(true);
          }}
          onOpenNukeDialog={() => props.state.setIsNukeDialogOpen(true)}
          onResetSelectedInsight={() => props.state.setSelectedInsightId(null)}
          onSetInsightsAgentFilter={props.state.setInsightsAgentFilter}
          onSetInsightsDateRange={props.state.setInsightsDateRange}
          onSetInsightsEndDate={props.state.setInsightsEndDate}
          onSetInsightsStartDate={props.state.setInsightsStartDate}
          onSetInsightsViewMode={props.state.setInsightsViewMode}
          persistedInsights={props.state.persistedInsights}
          preferences={props.queries.preferences}
          selectedInsightId={props.state.selectedInsightId}
          updatePreferencesMutation={props.mutations.updatePreferencesMutation}
          wickCoachCallCount={props.state.wickCoachCallCount}
          wickCoachError={props.state.wickCoachError}
          wickCoachStatus={props.state.wickCoachStatus}
        />
      )}

      <CallManagerAdminTabs canAccessAdmin={props.canAccessAdmin} />

      <CallHistoryTabContent
        agents={props.queries.agents}
        analyticsData={props.queries.analyticsData}
        analyticsLoading={props.queries.analyticsLoading}
        historyAgentFilter={props.state.historyAgentFilter}
        historyCampaignFilter={props.state.historyCampaignFilter}
        historyEndDate={props.state.historyEndDate}
        historyPage={props.state.historyPage}
        historySearchQuery={props.state.historySearchQuery}
        historyStartDate={props.state.historyStartDate}
        historyStatusFilter={props.state.historyStatusFilter}
        onHistoryAgentFilterChange={(value) => {
          props.state.setHistoryAgentFilter(value);
          props.state.setHistoryPage(1);
        }}
        onHistoryCampaignFilterChange={(value) => {
          props.state.setHistoryCampaignFilter(value);
          props.state.setHistoryPage(1);
        }}
        onHistoryEndDateChange={(value) => {
          props.state.setHistoryEndDate(value);
          props.state.setHistoryPage(1);
        }}
        onHistorySearchQueryChange={(value) => {
          props.state.setHistorySearchQuery(value);
          props.state.setHistoryPage(1);
        }}
        onHistoryStartDateChange={(value) => {
          props.state.setHistoryStartDate(value);
          props.state.setHistoryPage(1);
        }}
        onHistoryStatusFilterChange={(value) => {
          props.state.setHistoryStatusFilter(value);
          props.state.setHistoryPage(1);
        }}
        setHistoryPage={props.state.setHistoryPage}
        setStoreDetailsDialog={props.state.setStoreDetailsDialog}
        setStoreDetailsLoading={props.state.setStoreDetailsLoading}
        storeDetailsLoading={props.state.storeDetailsLoading}
        toast={props.toast}
      />
    </Tabs>
  );
}
