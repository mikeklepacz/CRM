import { Layout, Responsive, WidthProvider } from "react-grid-layout";

import { ActionAlertsWidget } from "@/components/widgets/action-alerts";
import { CommissionBreakdownWidget } from "@/components/widgets/commission-breakdown";
import { CommissionStatusWidget } from "@/components/widgets/commission-status";
import { PortfolioMetricsWidget } from "@/components/widgets/portfolio-metrics";
import { ReferralCommissionsWidget } from "@/components/widgets/referral-commissions";
import { RemindersWidget } from "@/components/widgets/reminders";
import { RevenueOverviewWidget } from "@/components/widgets/revenue-overview";
import { RevenueTrendsWidget } from "@/components/widgets/revenue-trends";
import { TopClientsWidget } from "@/components/widgets/top-clients";
import { WidgetWithContextMenu } from "./widget-with-context-menu";

const ResponsiveGridLayout = WidthProvider(Responsive);

export function SalesWidgetGrid({
  layouts,
  isLocked,
  visibleWidgets,
  onLayoutChange,
  onToggleWidgetVisibility,
  onPhoneClick,
}: {
  layouts: any;
  isLocked: boolean;
  visibleWidgets: Set<string>;
  onLayoutChange: (layout: Layout[], allLayouts: any) => void;
  onToggleWidgetVisibility: (id: string) => void;
  onPhoneClick: (storeIdentifier: string, phoneNumber?: string) => void;
}) {
  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768 }}
      cols={{ lg: 12, md: 12, sm: 12 }}
      rowHeight={100}
      isDraggable={!isLocked}
      isResizable={!isLocked}
      onLayoutChange={onLayoutChange}
      draggableHandle=".drag-handle"
    >
      {visibleWidgets.has("revenue-overview") && (
        <div key="revenue-overview">
          <WidgetWithContextMenu widgetId="revenue-overview" widgetName="Revenue Overview" onHide={() => onToggleWidgetVisibility("revenue-overview")}>
            <RevenueOverviewWidget />
          </WidgetWithContextMenu>
        </div>
      )}
      {visibleWidgets.has("commission-breakdown") && (
        <div key="commission-breakdown">
          <WidgetWithContextMenu widgetId="commission-breakdown" widgetName="Commission Breakdown" onHide={() => onToggleWidgetVisibility("commission-breakdown")}>
            <CommissionBreakdownWidget />
          </WidgetWithContextMenu>
        </div>
      )}
      {visibleWidgets.has("commission-status") && (
        <div key="commission-status">
          <WidgetWithContextMenu widgetId="commission-status" widgetName="Commission Status" onHide={() => onToggleWidgetVisibility("commission-status")}>
            <CommissionStatusWidget />
          </WidgetWithContextMenu>
        </div>
      )}
      {visibleWidgets.has("portfolio-metrics") && (
        <div key="portfolio-metrics">
          <WidgetWithContextMenu widgetId="portfolio-metrics" widgetName="Portfolio Metrics" onHide={() => onToggleWidgetVisibility("portfolio-metrics")}>
            <PortfolioMetricsWidget />
          </WidgetWithContextMenu>
        </div>
      )}
      {visibleWidgets.has("revenue-trends") && (
        <div key="revenue-trends">
          <WidgetWithContextMenu widgetId="revenue-trends" widgetName="Revenue Trends" onHide={() => onToggleWidgetVisibility("revenue-trends")}>
            <RevenueTrendsWidget />
          </WidgetWithContextMenu>
        </div>
      )}
      {visibleWidgets.has("action-alerts") && (
        <div key="action-alerts">
          <WidgetWithContextMenu widgetId="action-alerts" widgetName="Action Alerts" onHide={() => onToggleWidgetVisibility("action-alerts")}>
            <ActionAlertsWidget />
          </WidgetWithContextMenu>
        </div>
      )}
      {visibleWidgets.has("reminders") && (
        <div key="reminders">
          <WidgetWithContextMenu widgetId="reminders" widgetName="Reminders" onHide={() => onToggleWidgetVisibility("reminders")}>
            <RemindersWidget onPhoneClick={onPhoneClick} />
          </WidgetWithContextMenu>
        </div>
      )}
      {visibleWidgets.has("top-clients") && (
        <div key="top-clients">
          <WidgetWithContextMenu widgetId="top-clients" widgetName="Top Clients" onHide={() => onToggleWidgetVisibility("top-clients")}>
            <TopClientsWidget />
          </WidgetWithContextMenu>
        </div>
      )}
      {visibleWidgets.has("referral-commissions") && (
        <div key="referral-commissions">
          <WidgetWithContextMenu
            widgetId="referral-commissions"
            widgetName="Referral Commissions"
            onHide={() => onToggleWidgetVisibility("referral-commissions")}
          >
            <ReferralCommissionsWidget />
          </WidgetWithContextMenu>
        </div>
      )}
    </ResponsiveGridLayout>
  );
}
