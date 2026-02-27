import type { Dispatch, SetStateAction } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { CallHistoryFilters } from "@/components/call-manager/call-history-filters";
import { CallHistoryTableSection } from "@/components/call-manager/call-history-table-section";

interface CallHistoryTabContentProps {
  agents: any[];
  analyticsData: any;
  analyticsLoading: boolean;
  historyAgentFilter: string;
  historyCampaignFilter: string;
  historyEndDate: string;
  historyPage: number;
  historySearchQuery: string;
  historyStartDate: string;
  historyStatusFilter: string;
  onHistoryAgentFilterChange: (value: string) => void;
  onHistoryCampaignFilterChange: (value: string) => void;
  onHistoryEndDateChange: (value: string) => void;
  onHistorySearchQueryChange: (value: string) => void;
  onHistoryStartDateChange: (value: string) => void;
  onHistoryStatusFilterChange: (value: string) => void;
  setHistoryPage: Dispatch<SetStateAction<number>>;
  setStoreDetailsDialog: (dialog: { open: boolean; row: any } | null) => void;
  setStoreDetailsLoading: (value: string | null) => void;
  storeDetailsLoading: string | null;
  toast: any;
}

export function CallHistoryTabContent({
  agents,
  analyticsData,
  analyticsLoading,
  historyAgentFilter,
  historyCampaignFilter,
  historyEndDate,
  historyPage,
  historySearchQuery,
  historyStartDate,
  historyStatusFilter,
  onHistoryAgentFilterChange,
  onHistoryCampaignFilterChange,
  onHistoryEndDateChange,
  onHistorySearchQueryChange,
  onHistoryStartDateChange,
  onHistoryStatusFilterChange,
  setHistoryPage,
  setStoreDetailsDialog,
  setStoreDetailsLoading,
  storeDetailsLoading,
  toast,
}: CallHistoryTabContentProps) {
  return (
    <TabsContent value="call-history" className="space-y-6">
      <Card data-testid="card-call-history">
        <CardHeader>
          <CardTitle>Complete Call History</CardTitle>
          <CardDescription>
            Chronological list of all ElevenLabs calls with store details, status, and extracted data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CallHistoryFilters
            agents={agents}
            historyAgentFilter={historyAgentFilter}
            historyCampaignFilter={historyCampaignFilter}
            historyEndDate={historyEndDate}
            historySearchQuery={historySearchQuery}
            historyStartDate={historyStartDate}
            historyStatusFilter={historyStatusFilter}
            onAgentFilterChange={onHistoryAgentFilterChange}
            onCampaignFilterChange={onHistoryCampaignFilterChange}
            onEndDateChange={onHistoryEndDateChange}
            onSearchQueryChange={onHistorySearchQueryChange}
            onStartDateChange={onHistoryStartDateChange}
            onStatusFilterChange={onHistoryStatusFilterChange}
          />

          <CallHistoryTableSection
            analyticsData={analyticsData}
            analyticsLoading={analyticsLoading}
            historyAgentFilter={historyAgentFilter}
            historyCampaignFilter={historyCampaignFilter}
            historyEndDate={historyEndDate}
            historyPage={historyPage}
            historySearchQuery={historySearchQuery}
            historyStartDate={historyStartDate}
            historyStatusFilter={historyStatusFilter}
            setHistoryPage={setHistoryPage}
            setStoreDetailsDialog={setStoreDetailsDialog}
            setStoreDetailsLoading={setStoreDetailsLoading}
            storeDetailsLoading={storeDetailsLoading}
            toast={toast}
          />
        </CardContent>
      </Card>
    </TabsContent>
  );
}
