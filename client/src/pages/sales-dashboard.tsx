import { useState } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, RotateCcw, Settings2 } from "lucide-react";
import { RevenueOverviewWidget } from "@/components/widgets/revenue-overview";
import { CommissionBreakdownWidget } from "@/components/widgets/commission-breakdown";
import { PortfolioMetricsWidget } from "@/components/widgets/portfolio-metrics";
import { CommissionStatusWidget } from "@/components/widgets/commission-status";
import { TopClientsWidget } from "@/components/widgets/top-clients";
import { ActionAlertsWidget } from "@/components/widgets/action-alerts";
import { RevenueTrendsWidget } from "@/components/widgets/revenue-trends";
import { RemindersWidget } from "@/components/widgets/reminders";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

// Default layout configuration for widgets
const defaultLayouts = {
  lg: [
    { i: "revenue-overview", x: 0, y: 0, w: 6, h: 2, minW: 3, minH: 2 },
    { i: "commission-breakdown", x: 6, y: 0, w: 6, h: 2, minW: 3, minH: 2 },
    { i: "commission-status", x: 0, y: 2, w: 4, h: 3, minW: 3, minH: 2 },
    { i: "portfolio-metrics", x: 4, y: 2, w: 4, h: 3, minW: 3, minH: 2 },
    { i: "revenue-trends", x: 8, y: 2, w: 4, h: 3, minW: 3, minH: 2 },
    { i: "action-alerts", x: 0, y: 5, w: 6, h: 3, minW: 3, minH: 2 },
    { i: "reminders", x: 6, y: 5, w: 6, h: 3, minW: 3, minH: 2 },
    { i: "top-clients", x: 0, y: 8, w: 12, h: 3, minW: 6, minH: 2 },
  ],
  md: [
    { i: "revenue-overview", x: 0, y: 0, w: 6, h: 2, minW: 3, minH: 2 },
    { i: "commission-breakdown", x: 6, y: 0, w: 6, h: 2, minW: 3, minH: 2 },
    { i: "commission-status", x: 0, y: 2, w: 6, h: 3, minW: 3, minH: 2 },
    { i: "portfolio-metrics", x: 6, y: 2, w: 6, h: 3, minW: 3, minH: 2 },
    { i: "revenue-trends", x: 0, y: 5, w: 12, h: 3, minW: 6, minH: 2 },
    { i: "action-alerts", x: 0, y: 8, w: 6, h: 3, minW: 3, minH: 2 },
    { i: "reminders", x: 6, y: 8, w: 6, h: 3, minW: 3, minH: 2 },
    { i: "top-clients", x: 0, y: 11, w: 12, h: 3, minW: 6, minH: 2 },
  ],
  sm: [
    { i: "revenue-overview", x: 0, y: 0, w: 12, h: 2, minW: 6, minH: 2 },
    { i: "commission-breakdown", x: 0, y: 2, w: 12, h: 2, minW: 6, minH: 2 },
    { i: "commission-status", x: 0, y: 4, w: 12, h: 3, minW: 6, minH: 2 },
    { i: "portfolio-metrics", x: 0, y: 7, w: 12, h: 3, minW: 6, minH: 2 },
    { i: "revenue-trends", x: 0, y: 10, w: 12, h: 3, minW: 6, minH: 2 },
    { i: "action-alerts", x: 0, y: 13, w: 12, h: 3, minW: 6, minH: 2 },
    { i: "reminders", x: 0, y: 16, w: 12, h: 3, minW: 6, minH: 2 },
    { i: "top-clients", x: 0, y: 19, w: 12, h: 3, minW: 6, minH: 2 },
  ],
};

export default function SalesDashboard() {
  const [layouts, setLayouts] = useState(defaultLayouts);
  const [isLocked, setIsLocked] = useState(true);

  const handleLayoutChange = (layout: Layout[], allLayouts: any) => {
    if (!isLocked) {
      setLayouts(allLayouts);
      // TODO: Save layout to backend via API
      // await apiRequest('/api/widget-layout', { method: 'POST', body: { dashboardType: 'sales', layout: allLayouts } });
    }
  };

  const resetLayout = () => {
    setLayouts(defaultLayouts);
    // TODO: Reset layout on backend
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="heading-sales-dashboard">
            Sales Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your earnings, commissions, and client portfolio performance
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLocked(!isLocked)}
            data-testid="button-toggle-lock"
          >
            {isLocked ? (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Locked
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4 mr-2" />
                Unlocked
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetLayout}
            disabled={isLocked}
            data-testid="button-reset-layout"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Layout
          </Button>
        </div>
      </div>

      {/* Widget Grid */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 12, sm: 12 }}
        rowHeight={100}
        isDraggable={!isLocked}
        isResizable={!isLocked}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
      >
        {/* Revenue Overview Widget */}
        <div key="revenue-overview">
          <RevenueOverviewWidget />
        </div>

        {/* Commission Breakdown Widget */}
        <div key="commission-breakdown">
          <CommissionBreakdownWidget />
        </div>

        {/* Commission Status Widget */}
        <div key="commission-status">
          <CommissionStatusWidget />
        </div>

        {/* Portfolio Metrics Widget */}
        <div key="portfolio-metrics">
          <PortfolioMetricsWidget />
        </div>

        {/* Revenue Trends Widget */}
        <div key="revenue-trends">
          <RevenueTrendsWidget />
        </div>

        {/* Action Alerts Widget */}
        <div key="action-alerts">
          <ActionAlertsWidget />
        </div>

        {/* Reminders Widget */}
        <div key="reminders">
          <RemindersWidget />
        </div>

        {/* Top Clients Widget */}
        <div key="top-clients">
          <TopClientsWidget />
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}
