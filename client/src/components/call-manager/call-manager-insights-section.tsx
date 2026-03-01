import { AiInsightsTabContent } from "@/components/call-manager/ai-insights-tab-content";
import { CallManagerAdminTabs } from "@/components/call-manager/call-manager-admin-tabs";

export function CallManagerInsightsSection(props: any) {
  return (
    <>
      {props.canAccessAdmin && <AiInsightsTabContent {...props.insightsProps} />}
      <CallManagerAdminTabs canAccessAdmin={props.canAccessAdmin} />
    </>
  );
}
