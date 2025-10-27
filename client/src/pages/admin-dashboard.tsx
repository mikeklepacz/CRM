import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WooCommerceSync } from "@/components/woocommerce-sync";
import { GoogleSheetsSync } from "@/components/google-sheets-sync";
import { UserManagement } from "@/components/user-management";
import { SalesReports } from "@/components/sales-reports";
import { OpenAIManagement } from "@/components/openai-management";
import { AdminTicketInbox } from "@/components/admin-ticket-inbox";
import { WebhookManagement } from "@/components/webhook-management";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Fetch user preferences to get viewAsAgent state
  const { data: userPreferences } = useQuery<{
    viewAsAgent?: boolean;
  } | null>({
    queryKey: ['/api/user/preferences'],
    staleTime: Infinity,
  });

  const [viewAsAgent, setViewAsAgent] = useState(userPreferences?.viewAsAgent || false);

  // Sync state when preferences load
  useEffect(() => {
    if (userPreferences?.viewAsAgent !== undefined) {
      setViewAsAgent(userPreferences.viewAsAgent);
    }
  }, [userPreferences]);

  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin') {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [user, authLoading, toast]);

  if (authLoading || !user) return null;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Admin Dashboard</h2>
          <p className="text-muted-foreground">Manage integrations and system settings</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="admin-view-as-agent" className="text-sm font-medium cursor-pointer">
            View as Agent
          </Label>
          <Switch
            id="admin-view-as-agent"
            checked={viewAsAgent}
            onCheckedChange={async (checked) => {
              setViewAsAgent(checked);
              try {
                await apiRequest('PATCH', '/api/user/preferences', {
                  viewAsAgent: checked
                });
                toast({
                  title: checked ? "Switched to Agent View" : "Switched to Admin View",
                  description: checked 
                    ? "You're now viewing the Client Dashboard as an agent would see it." 
                    : "You're back to the full admin view.",
                });
              } catch (error) {
                console.error('Failed to save view mode:', error);
                toast({
                  title: "Error",
                  description: "Failed to save view preference",
                  variant: "destructive",
                });
              }
            }}
            data-testid="switch-view-as-agent"
          />
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="tickets" data-testid="tab-tickets">Support Tickets</TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
          <TabsTrigger value="webhooks" data-testid="tab-webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="openai" data-testid="tab-openai">OpenAI</TabsTrigger>
          <TabsTrigger value="sheets" data-testid="tab-sheets">Google Sheets</TabsTrigger>
          <TabsTrigger value="sync" data-testid="tab-sync">WooCommerce Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="tickets">
          <AdminTicketInbox />
        </TabsContent>

        <TabsContent value="reports">
          <SalesReports />
        </TabsContent>

        <TabsContent value="webhooks">
          <WebhookManagement />
        </TabsContent>

        <TabsContent value="openai">
          <OpenAIManagement />
        </TabsContent>

        <TabsContent value="sheets">
          <GoogleSheetsSync />
        </TabsContent>

        <TabsContent value="sync">
          <WooCommerceSync />
        </TabsContent>
      </Tabs>
    </div>
  );
}
