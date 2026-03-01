import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "react-grid-layout";
import { Lock, RotateCcw, Unlock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AgentFilterProvider } from "@/contexts/agent-filter-context";
import { AdminAgentToolbar } from "@/components/admin-agent-toolbar";
import { apiRequest } from "@/lib/queryClient";
import { AVAILABLE_WIDGETS, defaultLayouts } from "./sales-dashboard/config";
import { CustomizeWidgetsDialog } from "./sales-dashboard/customize-dialog";
import { SalesWidgetGrid } from "./sales-dashboard/widget-grid";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

export default function SalesDashboard() {
  const [, setLocation] = useLocation();
  const [layouts, setLayouts] = useState(defaultLayouts);
  const [isLocked, setIsLocked] = useState(true);
  const [visibleWidgets, setVisibleWidgets] = useState<Set<string>>(new Set(AVAILABLE_WIDGETS.map((w) => w.id)));
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);

  useEffect(() => {
    const loadLayout = async () => {
      try {
        const response = await fetch("/api/widget-layout?dashboardType=sales", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          if (data.layout) {
            if (data.layout.layoutConfig) setLayouts(data.layout.layoutConfig);
            if (data.layout.visibleWidgets) setVisibleWidgets(new Set(data.layout.visibleWidgets));
          }
        }
      } catch (error) {
        console.error("Failed to load widget layout:", error);
      }
    };
    loadLayout();
  }, []);

  const saveLayout = async (layoutConfig: any, visibility?: string[]) => {
    try {
      await apiRequest("POST", "/api/widget-layout", {
        dashboardType: "sales",
        layoutConfig,
        visibleWidgets: visibility || Array.from(visibleWidgets),
        isDefault: true,
      });
    } catch (error) {
      console.error("Failed to save widget layout:", error);
    }
  };

  const handleLayoutChange = (layout: Layout[], allLayouts: any) => {
    if (!isLocked) {
      setLayouts(allLayouts);
      saveLayout(allLayouts);
    }
  };

  const resetLayout = async () => {
    setLayouts(defaultLayouts);
    const allVisible = new Set(AVAILABLE_WIDGETS.map((w) => w.id));
    setVisibleWidgets(allVisible);
    await saveLayout(defaultLayouts, Array.from(allVisible));
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    const newVisible = new Set(visibleWidgets);
    if (newVisible.has(widgetId)) newVisible.delete(widgetId);
    else newVisible.add(widgetId);
    setVisibleWidgets(newVisible);
    saveLayout(layouts, Array.from(newVisible));
  };

  return (
    <AgentFilterProvider>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="heading-sales-dashboard">
              Sales Analytics
            </h1>
            <p className="text-muted-foreground mt-1">Track your earnings, commissions, and client portfolio performance</p>
          </div>

          <div className="flex items-center gap-2">
            <CustomizeWidgetsDialog
              open={customizeDialogOpen}
              onOpenChange={setCustomizeDialogOpen}
              widgets={AVAILABLE_WIDGETS}
              visibleWidgets={visibleWidgets}
              onToggleWidget={toggleWidgetVisibility}
            />

            <Button variant="outline" size="sm" onClick={() => setIsLocked(!isLocked)} data-testid="button-toggle-lock">
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
            <Button variant="outline" size="sm" onClick={resetLayout} disabled={isLocked} data-testid="button-reset-layout">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Layout
            </Button>
          </div>
        </div>

        <AdminAgentToolbar />

        <SalesWidgetGrid
          layouts={layouts}
          isLocked={isLocked}
          visibleWidgets={visibleWidgets}
          onLayoutChange={handleLayoutChange}
          onToggleWidgetVisibility={toggleWidgetVisibility}
          onPhoneClick={(storeIdentifier, phoneNumber) => {
            console.log("[SalesDashboard] onPhoneClick called:", { storeIdentifier, phoneNumber });
            const params = new URLSearchParams({ store: storeIdentifier });
            if (phoneNumber) params.append("phone", phoneNumber);
            setLocation(`/clients?${params.toString()}`);
          }}
        />
      </div>
    </AgentFilterProvider>
  );
}
