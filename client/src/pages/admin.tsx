import { useState, useEffect } from "react";
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

  const switchTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      return apiRequest('/api/super-admin/switch-tenant', {
        method: 'POST',
        body: JSON.stringify({ tenantId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({ title: "Switched organization", description: "Now viewing as selected organization" });
    },
    onError: (error: Error) => {
      toast({ title: "Error switching organization", description: error.message, variant: "destructive" });
    },
  });

  const clearTenantOverrideMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/super-admin/switch-tenant/clear', {
        method: 'GET',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
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
              <SelectItem value="users" data-testid="tab-users">Users</SelectItem>
              <SelectItem value="tickets" data-testid="tab-tickets">Support Tickets</SelectItem>
              <SelectItem value="campaigns" data-testid="tab-campaigns">Campaigns</SelectItem>
              <SelectItem value="reports" data-testid="tab-reports">Reports</SelectItem>
              <SelectItem value="calendar" data-testid="tab-calendar">Calendar</SelectItem>
              <SelectItem value="openai" data-testid="tab-openai">OpenAI</SelectItem>
              <SelectItem value="aligner" data-testid="tab-aligner">Aligner</SelectItem>
              <SelectItem value="docs" data-testid="tab-docs">Docs</SelectItem>
              <SelectItem value="sync" data-testid="tab-sync">WooCommerce Sync</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          /* Desktop/Tablet: Tabs with wrapping */
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
            <TabsTrigger value="tickets" data-testid="tab-tickets">Support Tickets</TabsTrigger>
            <TabsTrigger value="campaigns" data-testid="tab-campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-calendar">Calendar</TabsTrigger>
            <TabsTrigger value="openai" data-testid="tab-openai">OpenAI</TabsTrigger>
            <TabsTrigger value="aligner" data-testid="tab-aligner">Aligner</TabsTrigger>
            <TabsTrigger value="docs" data-testid="tab-docs">Docs</TabsTrigger>
            <TabsTrigger value="sync" data-testid="tab-sync">WooCommerce Sync</TabsTrigger>
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
