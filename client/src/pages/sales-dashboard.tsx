import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, RotateCcw, Settings2, Eye, EyeOff, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { RevenueOverviewWidget } from "@/components/widgets/revenue-overview";
import { CommissionBreakdownWidget } from "@/components/widgets/commission-breakdown";
import { PortfolioMetricsWidget } from "@/components/widgets/portfolio-metrics";
import { CommissionStatusWidget } from "@/components/widgets/commission-status";
import { TopClientsWidget } from "@/components/widgets/top-clients";
import { ActionAlertsWidget } from "@/components/widgets/action-alerts";
import { RevenueTrendsWidget } from "@/components/widgets/revenue-trends";
import { RemindersWidget } from "@/components/widgets/reminders";
import { ReferralCommissionsWidget } from "@/components/widgets/referral-commissions";
import { apiRequest } from "@/lib/queryClient";
import { AgentFilterProvider } from "@/contexts/agent-filter-context";
import { AdminAgentToolbar } from "@/components/admin-agent-toolbar";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

// Widget definitions for easy management
const AVAILABLE_WIDGETS = [
  { id: "revenue-overview", name: "Revenue Overview", description: "Total earnings and monthly averages" },
  { id: "commission-breakdown", name: "Commission Breakdown", description: "25% vs 10% tier earnings" },
  { id: "commission-status", name: "Commission Status", description: "Recent commission activity" },
  { id: "portfolio-metrics", name: "Portfolio Metrics", description: "Client portfolio statistics" },
  { id: "revenue-trends", name: "Revenue Trends", description: "Time-based revenue analysis" },
  { id: "action-alerts", name: "Action Alerts", description: "Important follow-ups and alerts" },
  { id: "reminders", name: "Reminders", description: "Upcoming reminders and tasks" },
  { id: "top-clients", name: "Top Clients", description: "Highest earning clients" },
  { id: "referral-commissions", name: "Referral Commissions", description: "Agents earning from referrals" },
];

// Default layout configuration for widgets
const defaultLayouts = {
  lg: [
    { i: "revenue-overview", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 1 },
    { i: "commission-breakdown", x: 6, y: 0, w: 6, h: 2, minW: 2, minH: 1 },
    { i: "commission-status", x: 0, y: 2, w: 4, h: 3, minW: 2, minH: 2 },
    { i: "portfolio-metrics", x: 4, y: 2, w: 4, h: 3, minW: 2, minH: 2 },
    { i: "revenue-trends", x: 8, y: 2, w: 4, h: 4, minW: 2, minH: 2 },
    { i: "action-alerts", x: 0, y: 6, w: 6, h: 3, minW: 2, minH: 2 },
    { i: "reminders", x: 6, y: 6, w: 6, h: 3, minW: 2, minH: 2 },
    { i: "top-clients", x: 0, y: 9, w: 12, h: 3, minW: 4, minH: 2 },
    { i: "referral-commissions", x: 0, y: 12, w: 12, h: 3, minW: 4, minH: 2 },
  ],
  md: [
    { i: "revenue-overview", x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 1 },
    { i: "commission-breakdown", x: 6, y: 0, w: 6, h: 2, minW: 2, minH: 1 },
    { i: "commission-status", x: 0, y: 2, w: 6, h: 3, minW: 2, minH: 2 },
    { i: "portfolio-metrics", x: 6, y: 2, w: 6, h: 3, minW: 2, minH: 2 },
    { i: "revenue-trends", x: 0, y: 5, w: 12, h: 4, minW: 4, minH: 2 },
    { i: "action-alerts", x: 0, y: 9, w: 6, h: 3, minW: 2, minH: 2 },
    { i: "reminders", x: 6, y: 9, w: 6, h: 3, minW: 2, minH: 2 },
    { i: "top-clients", x: 0, y: 12, w: 12, h: 3, minW: 4, minH: 2 },
    { i: "referral-commissions", x: 0, y: 15, w: 12, h: 3, minW: 4, minH: 2 },
  ],
  sm: [
    { i: "revenue-overview", x: 0, y: 0, w: 12, h: 2, minW: 4, minH: 1 },
    { i: "commission-breakdown", x: 0, y: 2, w: 12, h: 2, minW: 4, minH: 1 },
    { i: "commission-status", x: 0, y: 4, w: 12, h: 3, minW: 4, minH: 2 },
    { i: "portfolio-metrics", x: 0, y: 7, w: 12, h: 3, minW: 4, minH: 2 },
    { i: "revenue-trends", x: 0, y: 10, w: 12, h: 4, minW: 4, minH: 2 },
    { i: "action-alerts", x: 0, y: 14, w: 12, h: 3, minW: 4, minH: 2 },
    { i: "reminders", x: 0, y: 17, w: 12, h: 3, minW: 4, minH: 2 },
    { i: "top-clients", x: 0, y: 20, w: 12, h: 3, minW: 4, minH: 2 },
    { i: "referral-commissions", x: 0, y: 23, w: 12, h: 3, minW: 4, minH: 2 },
  ],
};

// Widget wrapper with context menu for hiding
function WidgetWithContextMenu({ 
  widgetId, 
  widgetName,
  children, 
  onHide 
}: { 
  widgetId: string;
  widgetName: string;
  children: React.ReactNode;
  onHide: () => void;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="h-full w-full">
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent data-testid={`context-menu-${widgetId}`}>
        <ContextMenuItem onClick={onHide} data-testid={`menu-hide-${widgetId}`}>
          <EyeOff className="h-4 w-4 mr-2" />
          Hide {widgetName}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default function SalesDashboard() {
  const [, setLocation] = useLocation();
  const [layouts, setLayouts] = useState(defaultLayouts);
  const [isLocked, setIsLocked] = useState(true);
  const [visibleWidgets, setVisibleWidgets] = useState<Set<string>>(
    new Set(AVAILABLE_WIDGETS.map(w => w.id))
  );
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);

  // Load saved layout and visibility on mount
  useEffect(() => {
    const loadLayout = async () => {
      try {
        const response = await fetch('/api/widget-layout?dashboardType=sales', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          if (data.layout) {
            if (data.layout.layoutConfig) {
              setLayouts(data.layout.layoutConfig);
            }
            if (data.layout.visibleWidgets) {
              setVisibleWidgets(new Set(data.layout.visibleWidgets));
            }
          }
        }
      } catch (error) {
        // Fall back to default layouts on error
      }
    };
    loadLayout();
  }, []);

  const handleLayoutChange = (layout: Layout[], allLayouts: any) => {
    if (!isLocked) {
      setLayouts(allLayouts);
      // Save layout to backend
      saveLayout(allLayouts);
    }
  };

  const saveLayout = async (layoutConfig: any, visibility?: string[]) => {
    try {
      await apiRequest('POST', '/api/widget-layout', {
        dashboardType: 'sales',
        layoutConfig,
        visibleWidgets: visibility || Array.from(visibleWidgets),
        isDefault: true
      });
    } catch (error) {
    }
  };

  const resetLayout = async () => {
    setLayouts(defaultLayouts);
    const allVisible = new Set(AVAILABLE_WIDGETS.map(w => w.id));
    setVisibleWidgets(allVisible);
    // Clear layout on backend by saving default
    await saveLayout(defaultLayouts, Array.from(allVisible));
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    const newVisible = new Set(visibleWidgets);
    if (newVisible.has(widgetId)) {
      newVisible.delete(widgetId);
    } else {
      newVisible.add(widgetId);
    }
    setVisibleWidgets(newVisible);
    saveLayout(layouts, Array.from(newVisible));
  };

  return (
    <AgentFilterProvider>
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
          <Dialog open={customizeDialogOpen} onOpenChange={setCustomizeDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                data-testid="button-customize-widgets"
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Customize Widgets
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" data-testid="dialog-customize-widgets">
              <DialogHeader>
                <DialogTitle>Customize Dashboard Widgets</DialogTitle>
                <DialogDescription>
                  Choose which widgets to display on your dashboard
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {AVAILABLE_WIDGETS.map((widget) => (
                  <div key={widget.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={`widget-${widget.id}`}
                      checked={visibleWidgets.has(widget.id)}
                      onCheckedChange={() => toggleWidgetVisibility(widget.id)}
                      data-testid={`checkbox-widget-${widget.id}`}
                    />
                    <div className="grid gap-1.5 leading-none flex-1">
                      <Label
                        htmlFor={`widget-${widget.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {widget.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {widget.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          
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

      {/* Admin Agent Filter Toolbar */}
      <AdminAgentToolbar />

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
        {visibleWidgets.has("revenue-overview") && (
          <div key="revenue-overview">
            <WidgetWithContextMenu
              widgetId="revenue-overview"
              widgetName="Revenue Overview"
              onHide={() => toggleWidgetVisibility("revenue-overview")}
            >
              <RevenueOverviewWidget />
            </WidgetWithContextMenu>
          </div>
        )}

        {visibleWidgets.has("commission-breakdown") && (
          <div key="commission-breakdown">
            <WidgetWithContextMenu
              widgetId="commission-breakdown"
              widgetName="Commission Breakdown"
              onHide={() => toggleWidgetVisibility("commission-breakdown")}
            >
              <CommissionBreakdownWidget />
            </WidgetWithContextMenu>
          </div>
        )}

        {visibleWidgets.has("commission-status") && (
          <div key="commission-status">
            <WidgetWithContextMenu
              widgetId="commission-status"
              widgetName="Commission Status"
              onHide={() => toggleWidgetVisibility("commission-status")}
            >
              <CommissionStatusWidget />
            </WidgetWithContextMenu>
          </div>
        )}

        {visibleWidgets.has("portfolio-metrics") && (
          <div key="portfolio-metrics">
            <WidgetWithContextMenu
              widgetId="portfolio-metrics"
              widgetName="Portfolio Metrics"
              onHide={() => toggleWidgetVisibility("portfolio-metrics")}
            >
              <PortfolioMetricsWidget />
            </WidgetWithContextMenu>
          </div>
        )}

        {visibleWidgets.has("revenue-trends") && (
          <div key="revenue-trends">
            <WidgetWithContextMenu
              widgetId="revenue-trends"
              widgetName="Revenue Trends"
              onHide={() => toggleWidgetVisibility("revenue-trends")}
            >
              <RevenueTrendsWidget />
            </WidgetWithContextMenu>
          </div>
        )}

        {visibleWidgets.has("action-alerts") && (
          <div key="action-alerts">
            <WidgetWithContextMenu
              widgetId="action-alerts"
              widgetName="Action Alerts"
              onHide={() => toggleWidgetVisibility("action-alerts")}
            >
              <ActionAlertsWidget />
            </WidgetWithContextMenu>
          </div>
        )}

        {visibleWidgets.has("reminders") && (
          <div key="reminders">
            <WidgetWithContextMenu
              widgetId="reminders"
              widgetName="Reminders"
              onHide={() => toggleWidgetVisibility("reminders")}
            >
              <RemindersWidget 
                onPhoneClick={(storeIdentifier, phoneNumber) => {
                  // Navigate to Clients page with store parameter to auto-open details
                  // Phone number will trigger dial after delay
                  const params = new URLSearchParams({ store: storeIdentifier });
                  if (phoneNumber) {
                    params.append('phone', phoneNumber);
                  }
                  setLocation(`/clients?${params.toString()}`);
                }}
              />
            </WidgetWithContextMenu>
          </div>
        )}

        {visibleWidgets.has("top-clients") && (
          <div key="top-clients">
            <WidgetWithContextMenu
              widgetId="top-clients"
              widgetName="Top Clients"
              onHide={() => toggleWidgetVisibility("top-clients")}
            >
              <TopClientsWidget />
            </WidgetWithContextMenu>
          </div>
        )}

        {visibleWidgets.has("referral-commissions") && (
          <div key="referral-commissions">
            <WidgetWithContextMenu
              widgetId="referral-commissions"
              widgetName="Referral Commissions"
              onHide={() => toggleWidgetVisibility("referral-commissions")}
            >
              <ReferralCommissionsWidget />
            </WidgetWithContextMenu>
          </div>
        )}
      </ResponsiveGridLayout>
    </div>
    </AgentFilterProvider>
  );
}
