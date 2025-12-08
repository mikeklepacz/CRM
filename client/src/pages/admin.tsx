import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { canAccessAdminFeatures } from "@/lib/authUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const ADMIN_TAB_MODULE_MAP: Record<string, string | null> = {
  users: null,
  tickets: null,
  campaigns: "qualification",
  reports: null,
  calendar: null,
  openai: "voice_kb",
  aligner: "voice_kb",
  docs: "docs",
  sync: "crm",
};

// Admin components (tenant-level only - Webhooks, Voice, Google Sheets moved to Super Admin)
import { WooCommerceSync } from "@/components/woocommerce-sync";
import { UserManagement } from "@/components/user-management";
import { SalesReports } from "@/components/sales-reports";
import { OpenAIManagement } from "@/components/openai-management";
import { AlignerManagement } from "@/components/aligner-management";
import { AdminTicketInbox } from "@/components/admin-ticket-inbox";
import { DriveFolderConfig } from "@/components/drive-folder-config";
import { HolidayCalendar } from "@/components/holiday-calendar";
import { QualificationCampaignManagement } from "@/components/qualification-campaign-management";

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const [activeAdminTab, setActiveAdminTab] = useState("users");
  const { toast } = useToast();

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery<{ tenants: Array<{ id: string; name: string }> }>({
    queryKey: ['/api/super-admin/tenants'],
    enabled: !!user?.isSuperAdmin,
  });

  const invalidateTenantData = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    queryClient.invalidateQueries({ queryKey: ['/api/openai/files'] });
    queryClient.invalidateQueries({ queryKey: ['/api/openai/settings'] });
    queryClient.invalidateQueries({ queryKey: ['/api/kb/files'] });
    queryClient.invalidateQueries({ queryKey: ['/api/kb/proposals'] });
    queryClient.invalidateQueries({ queryKey: ['/api/categories/active'] });
    queryClient.invalidateQueries({ queryKey: ['/api/elevenlabs/agents'] });
    queryClient.invalidateQueries({ queryKey: ['/api/aligner'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
    queryClient.invalidateQueries({ queryKey: ['/api/tickets/admin'] });
    queryClient.invalidateQueries({ queryKey: ['/api/tickets/unread-count'] });
    queryClient.invalidateQueries({ queryKey: ['/api/qualification-campaigns'] });
  };

  const switchTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      return apiRequest('POST', '/api/super-admin/switch-tenant', { tenantId });
    },
    onSuccess: () => {
      invalidateTenantData();
      toast({ title: "Switched organization", description: "Now viewing as selected organization" });
    },
    onError: (error: Error) => {
      toast({ title: "Error switching organization", description: error.message, variant: "destructive" });
    },
  });

  const clearTenantOverrideMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('GET', '/api/super-admin/switch-tenant/clear');
    },
    onSuccess: () => {
      invalidateTenantData();
      toast({ title: "Cleared override", description: "Returned to your default organization" });
    },
    onError: (error: Error) => {
      toast({ title: "Error clearing override", description: error.message, variant: "destructive" });
    },
  });

  // Redirect non-admins to dashboard
  useEffect(() => {
    if (user && !canAccessAdminFeatures(user)) {
      setLocation('/');
    }
  }, [user, setLocation]);

  if (authLoading) return null;

  // Check if user has access
  const hasAccess = canAccessAdminFeatures(user);

  if (!hasAccess) {
    return null; // Will redirect via useEffect
  }

  const isMutating = switchTenantMutation.isPending || clearTenantOverrideMutation.isPending;
  const currentTenantName = tenantsData?.tenants?.find(t => t.id === user?.tenantId)?.name || user?.tenantName;
  const selectValue = user?.tenantId || '__none__';

  const isTabEnabled = (tabId: string): boolean => {
    // Aligner tab is Super Admin only
    if (tabId === 'aligner' && !user?.isSuperAdmin) {
      return false;
    }
    const requiredModule = ADMIN_TAB_MODULE_MAP[tabId];
    if (!requiredModule) return true;
    const allowed = (user as any)?.allowedModules;
    if (allowed === null || allowed === undefined) return true;
    return Array.isArray(allowed) && allowed.includes(requiredModule);
  };

  const visibleTabs = useMemo(() => {
    return Object.keys(ADMIN_TAB_MODULE_MAP).filter(isTabEnabled);
  }, [user]);

  useEffect(() => {
    if (!isTabEnabled(activeAdminTab) && visibleTabs.length > 0) {
      setActiveAdminTab(visibleTabs[0]);
    }
  }, [visibleTabs, activeAdminTab]);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {user?.isSuperAdmin && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Viewing:</span>
          {tenantsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading organizations...
            </div>
          ) : (
            <>
              <Select
                value={selectValue}
                onValueChange={(value) => {
                  if (value !== '__none__') {
                    switchTenantMutation.mutate(value);
                  }
                }}
                disabled={isMutating}
              >
                <SelectTrigger className="w-[200px]" data-testid="tenant-switcher">
                  {isMutating ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Switching...</span>
                    </div>
                  ) : (
                    <SelectValue placeholder="Select organization">
                      {currentTenantName || 'Select organization'}
                    </SelectValue>
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" disabled>
                    Select organization
                  </SelectItem>
                  {tenantsData?.tenants?.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id} data-testid={`tenant-option-${tenant.id}`}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(user as any).isViewingAsTenant && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => clearTenantOverrideMutation.mutate()}
                  disabled={isMutating}
                  data-testid="clear-tenant-override"
                >
                  {clearTenantOverrideMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Clear'
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      )}
      <div className="mb-6">
        <h2 className="text-3xl font-semibold text-foreground">Admin</h2>
        <p className="text-muted-foreground">Manage system settings and integrations</p>
      </div>
      
      <Tabs value={activeAdminTab} onValueChange={setActiveAdminTab} className="space-y-4">
        {/* Mobile: Dropdown */}
        {isMobile ? (
          <Select value={activeAdminTab} onValueChange={setActiveAdminTab}>
            <SelectTrigger className="w-full" data-testid="mobile-admin-tab-selector">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {isTabEnabled("users") && <SelectItem value="users" data-testid="tab-users">Users</SelectItem>}
              {isTabEnabled("tickets") && <SelectItem value="tickets" data-testid="tab-tickets">Support Tickets</SelectItem>}
              {isTabEnabled("campaigns") && <SelectItem value="campaigns" data-testid="tab-campaigns">Campaigns</SelectItem>}
              {isTabEnabled("reports") && <SelectItem value="reports" data-testid="tab-reports">Reports</SelectItem>}
              {isTabEnabled("calendar") && <SelectItem value="calendar" data-testid="tab-calendar">Calendar</SelectItem>}
              {isTabEnabled("openai") && <SelectItem value="openai" data-testid="tab-openai">OpenAI</SelectItem>}
              {isTabEnabled("aligner") && <SelectItem value="aligner" data-testid="tab-aligner">Aligner</SelectItem>}
              {isTabEnabled("docs") && <SelectItem value="docs" data-testid="tab-docs">Docs</SelectItem>}
              {isTabEnabled("sync") && <SelectItem value="sync" data-testid="tab-sync">WooCommerce Sync</SelectItem>}
            </SelectContent>
          </Select>
        ) : (
          /* Desktop/Tablet: Tabs with wrapping */
          <TabsList className="flex flex-wrap h-auto gap-1">
            {isTabEnabled("users") && <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>}
            {isTabEnabled("tickets") && <TabsTrigger value="tickets" data-testid="tab-tickets">Support Tickets</TabsTrigger>}
            {isTabEnabled("campaigns") && <TabsTrigger value="campaigns" data-testid="tab-campaigns">Campaigns</TabsTrigger>}
            {isTabEnabled("reports") && <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>}
            {isTabEnabled("calendar") && <TabsTrigger value="calendar" data-testid="tab-calendar">Calendar</TabsTrigger>}
            {isTabEnabled("openai") && <TabsTrigger value="openai" data-testid="tab-openai">OpenAI</TabsTrigger>}
            {isTabEnabled("aligner") && <TabsTrigger value="aligner" data-testid="tab-aligner">Aligner</TabsTrigger>}
            {isTabEnabled("docs") && <TabsTrigger value="docs" data-testid="tab-docs">Docs</TabsTrigger>}
            {isTabEnabled("sync") && <TabsTrigger value="sync" data-testid="tab-sync">WooCommerce Sync</TabsTrigger>}
          </TabsList>
        )}

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="tickets">
          <AdminTicketInbox />
        </TabsContent>

        <TabsContent value="campaigns">
          <QualificationCampaignManagement />
        </TabsContent>

        <TabsContent value="reports">
          <SalesReports />
        </TabsContent>

        <TabsContent value="calendar">
          <HolidayCalendar />
        </TabsContent>

        <TabsContent value="openai">
          <OpenAIManagement />
        </TabsContent>

        <TabsContent value="aligner">
          <AlignerManagement />
        </TabsContent>

        <TabsContent value="docs">
          <DriveFolderConfig />
        </TabsContent>

        <TabsContent value="sync">
          <WooCommerceSync />
        </TabsContent>
      </Tabs>
    </div>
  );
}
