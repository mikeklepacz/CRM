import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { canAccessAdminFeatures } from "@/lib/authUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";

// Admin components (tenant-level only - Webhooks, Voice, Google Sheets moved to Super Admin)
import { WooCommerceSync } from "@/components/woocommerce-sync";
import { UserManagement } from "@/components/user-management";
import { SalesReports } from "@/components/sales-reports";
import { OpenAIManagement } from "@/components/openai-management";
import { AlignerManagement } from "@/components/aligner-management";
import { AdminTicketInbox } from "@/components/admin-ticket-inbox";
import { DriveFolderConfig } from "@/components/drive-folder-config";
import { HolidayCalendar } from "@/components/holiday-calendar";

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const [activeAdminTab, setActiveAdminTab] = useState("users");

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

  return (
    <div className="container mx-auto p-6 max-w-7xl">
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
