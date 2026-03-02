import { AiAnalyticsTabContent } from "@/components/call-manager/ai-analytics-tab-content";
import { CallHistoryTabContent } from "@/components/call-manager/call-history-tab-content";

export function CallManagerAnalyticsSection(props: any) {
  return (
    <>
      <AiAnalyticsTabContent {...props.analyticsProps} />
      <CallHistoryTabContent {...props.historyProps} />
    </>
  );
}
