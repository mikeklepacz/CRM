import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientsTable } from "@/components/clients-table";
import { RemindersWidget } from "@/components/widgets/reminders";
import { CallHistoryDialog } from "@/components/call-history-dialog";
import { StoreDetailsDialog } from "@/components/store-details-dialog";
import { useCustomTheme } from "@/hooks/use-custom-theme";
import { apiRequest } from "@/lib/queryClient";
import { Users, DollarSign, TrendingUp, Calendar, Search, CalendarIcon, Phone as PhoneIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { Client } from "@shared/schema";
import type { DateRange } from "react-day-picker";
import { useIsMobile } from "@/hooks/use-mobile";

// Admin components
import { WooCommerceSync } from "@/components/woocommerce-sync";
import { GoogleSheetsSync } from "@/components/google-sheets-sync";
import { UserManagement } from "@/components/user-management";
import { SalesReports } from "@/components/sales-reports";
import { OpenAIManagement } from "@/components/openai-management";
import { AlignerManagement } from "@/components/aligner-management";
import { AdminTicketInbox } from "@/components/admin-ticket-inbox";
import { WebhookManagement } from "@/components/webhook-management";
import { DriveFolderConfig } from "@/components/drive-folder-config";
import { VoiceSettings } from "@/components/voice-settings";

interface Status {
  id: string;
  name: string;
  color: string;
}

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [inactivityDays, setInactivityDays] = useState("all");
  const [timePeriod, setTimePeriod] = useState("all");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [callHistoryOpen, setCallHistoryOpen] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState("users");

  // Store details dialog state
  const [storeDetailsDialog, setStoreDetailsDialog] = useState<{
    open: boolean;
    row: any;
    autoCallPhone?: string;
  } | null>(null);

  // AI Assistant context update trigger
  const [contextUpdateTrigger, setContextUpdateTrigger] = useState(0);
  const [loadDefaultScriptTrigger, setLoadDefaultScriptTrigger] = useState(0);

  // Custom theme for status colors
  const { currentColors, statusColors, statusOptions } = useCustomTheme();

  const { data: clients = [], isLoading: clientsLoading, refetch: refetchClients } = useQuery<Client[]>({
    queryKey: ["/api/clients/my"],
  });

  const { data: statusesResponse } = useQuery<{ statuses: Status[] }>({
    queryKey: ["/api/statuses"],
  });

  const statuses = statusesResponse?.statuses || [];

  // Fetch user preferences for reminder settings
  const { data: userPreferences } = useQuery<any>({
    queryKey: ["/api/user/preferences"],
  });

  // Fetch sheets data for tracker and store database IDs
  const { data: sheetsData } = useQuery<{ sheets: any[] }>({
    queryKey: ["/api/sheets"],
  });

  const trackerSheet = sheetsData?.sheets?.find((sheet: any) =>
    sheet.sheetPurpose === 'commissions'
  );
  const storeDbSheet = sheetsData?.sheets?.find((sheet: any) =>
    sheet.sheetPurpose === 'Store Database'
  );

  // Auto-call logic when dialog opens with phone number
  useEffect(() => {
    if (storeDetailsDialog?.open && storeDetailsDialog?.autoCallPhone) {
      const phoneNumber = storeDetailsDialog.autoCallPhone;
      const row = storeDetailsDialog.row;
      const storeLink = row.link || row.Link;
      const storeName = row.name || row.Name || row.Company || 'Unknown Store';

      // Log the call to database
      apiRequest('POST', '/api/call-history', {
        storeLink: storeLink,
        phoneNumber: phoneNumber,
        storeName: storeName,
      }).catch(error => {
        console.error('Failed to log call:', error);
        // Don't block the call if logging fails
      });

      // Trigger default script loading in AI assistant
      setLoadDefaultScriptTrigger(prev => prev + 1);

      // Trigger phone dialer after a delay so user sees the dialog first
      setTimeout(() => {
        window.location.href = `tel:${phoneNumber}`;
      }, 800);

      // Clear the autoCallPhone flag so it doesn't trigger again
      setStoreDetailsDialog(prev => prev ? { ...prev, autoCallPhone: undefined } : null);
    }
  }, [storeDetailsDialog?.open, storeDetailsDialog?.autoCallPhone]);

  useEffect(() => {
    if (!authLoading && !user) {
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

  const isAdmin = user.role === 'admin';

  // Helper function to check if a client is in the time range
  const isClientInTimeRange = (client: Client, timeRange: { from?: Date; to?: Date } | undefined): boolean => {
    if (!timeRange?.from && !timeRange?.to) return true;

    const claimDate = client.claimDate ? new Date(client.claimDate) : null;
    const lastOrderDate = client.lastOrderDate ? new Date(client.lastOrderDate) : null;

    // Check if either date falls within the time period
    const claimInRange = !!(claimDate &&
      (!timeRange?.from || claimDate >= timeRange.from) &&
      (!timeRange?.to || claimDate <= timeRange.to));

    const orderInRange = !!(lastOrderDate &&
      (!timeRange?.from || lastOrderDate >= timeRange.from) &&
      (!timeRange?.to || lastOrderDate <= timeRange.to));

    // Include client if either date is in range
    return claimInRange || orderInRange;
  };

  // Calculate time period filter dates
  const getTimePeriodDates = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (timePeriod) {
      case "today":
        return { from: today, to: now };
      case "week": {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { from: weekAgo, to: now };
      }
      case "month": {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return { from: monthAgo, to: now };
      }
      case "quarter": {
        const quarterAgo = new Date(today);
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        return { from: quarterAgo, to: now };
      }
      case "year": {
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return { from: yearAgo, to: now };
      }
      case "custom":
        return customDateRange;
      default:
        return { from: undefined, to: undefined };
    }
  };

  const timeFilter = getTimePeriodDates();

  const filteredClients = clients.filter(client => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const dataStr = JSON.stringify(client.data).toLowerCase();
      if (!dataStr.includes(searchLower)) return false;
    }

    // Status filter
    if (status !== "all") {
      const googleSheetsStatus = client.data?.['Status'] || client.data?.['status'];
      const databaseStatus = client.status; // 'claimed', 'unassigned', etc.
      
      // Check both Google Sheets status and database status
      // This allows filtering by admin-created statuses AND system statuses like "Claimed"
      const matchesGoogleSheets = googleSheetsStatus === status;
      const matchesDatabase = databaseStatus?.toLowerCase() === status.toLowerCase();
      
      if (!matchesGoogleSheets && !matchesDatabase) return false;
    }

    // Inactivity filter
    if (inactivityDays !== "all") {
      if (!client.lastOrderDate) return true;
      const daysSinceOrder = Math.floor((Date.now() - new Date(client.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceOrder < parseInt(inactivityDays)) return false;
    }

    // Time period filter - include if EITHER claim date OR last order date falls within range
    if (!isClientInTimeRange(client, timeFilter)) return false;

    return true;
  });

  // Calculate stats from filtered clients based on time period
  const statsClients = clients.filter(client => isClientInTimeRange(client, timeFilter));

  const totalSales = statsClients.reduce((sum, c) => sum + parseFloat(c.totalSales || '0'), 0);
  const totalCommission = statsClients.reduce((sum, c) => sum + parseFloat(c.commissionTotal || '0'), 0);
  const inactive90Days = statsClients.filter(c => {
    if (!c.lastOrderDate) return false;
    const days = Math.floor((Date.now() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
    return days >= 90;
  }).length;

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setInactivityDays("all");
    setTimePeriod("all");
    setCustomDateRange(undefined);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left Column - Main Dashboard Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 px-4 py-6 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">My Dashboard</h2>
            <p className="text-muted-foreground">Track your claimed clients and commissions</p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold" data-testid="text-my-clients">{statsClients.length}</div>
                <p className="text-xs text-muted-foreground">
                  Claimed by you
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold" data-testid="text-my-sales">
                  ${totalSales.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  From your clients
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold" data-testid="text-my-commission">
                  ${totalCommission.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Your earnings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Needs Follow-up</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold" data-testid="text-needs-followup">{inactive90Days}</div>
                <p className="text-xs text-muted-foreground">
                  90+ days inactive
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Time Period Filter */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Period</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={timePeriod} onValueChange={setTimePeriod}>
                    <SelectTrigger className="w-[140px]" data-testid="select-time-period">
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">Last 30 Days</SelectItem>
                      <SelectItem value="quarter">Last 90 Days</SelectItem>
                      <SelectItem value="year">Last Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>

                  {timePeriod === "custom" && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" data-testid="button-custom-date">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customDateRange?.from ? (
                            customDateRange.to ? (
                              <>
                                {format(customDateRange.from, "LLL dd, y")} -{" "}
                                {format(customDateRange.to, "LLL dd, y")}
                              </>
                            ) : (
                              format(customDateRange.from, "LLL dd, y")
                            )
                          ) : (
                            <span>Pick a date range</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          initialFocus
                          mode="range"
                          defaultMonth={customDateRange?.from}
                          selected={customDateRange}
                          onSelect={setCustomDateRange}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-sm font-medium">Filters</CardTitle>
                {(search || status !== "all" || inactivityDays !== "all") && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-clients"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-[160px]" data-testid="select-status">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statuses.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={inactivityDays} onValueChange={setInactivityDays}>
                  <SelectTrigger className="w-[160px]" data-testid="select-inactivity">
                    <SelectValue placeholder="Inactive Days" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activity</SelectItem>
                    <SelectItem value="30">30+ Days</SelectItem>
                    <SelectItem value="60">60+ Days</SelectItem>
                    <SelectItem value="90">90+ Days</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => setCallHistoryOpen(true)}
                  data-testid="button-call-history"
                >
                  <PhoneIcon className="mr-2 h-4 w-4" />
                  Call History
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scrollable Clients Table */}
        <div className="flex-1 overflow-auto px-4">
          <ClientsTable
            clients={filteredClients}
            isLoading={clientsLoading}
            onRefresh={refetchClients}
            statusColors={statusColors}
            statusOptions={statusOptions}
            onOpenStoreDetails={(row: any, autoCallPhone?: string) => setStoreDetailsDialog({ open: true, row, autoCallPhone })}
            contextUpdateTrigger={contextUpdateTrigger}
            loadDefaultScriptTrigger={loadDefaultScriptTrigger}
          />
        </div>

        {/* Admin Section - Only for Admins */}
        {isAdmin && (
          <div className="flex-shrink-0 px-4 py-6 border-t">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-foreground">Admin</h3>
              <p className="text-sm text-muted-foreground">Manage system settings and integrations</p>
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
                    <SelectItem value="webhooks" data-testid="tab-webhooks">Webhooks</SelectItem>
                    <SelectItem value="voice" data-testid="tab-voice">Voice</SelectItem>
                    <SelectItem value="openai" data-testid="tab-openai">OpenAI</SelectItem>
                    <SelectItem value="aligner" data-testid="tab-aligner">Aligner</SelectItem>
                    <SelectItem value="sheets" data-testid="tab-sheets">Google Sheets</SelectItem>
                    <SelectItem value="assets" data-testid="tab-assets">Assets</SelectItem>
                    <SelectItem value="sync" data-testid="tab-sync">WooCommerce Sync</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                /* Desktop/Tablet: Tabs with wrapping */
                <TabsList className="flex flex-wrap h-auto gap-1">
                  <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
                  <TabsTrigger value="tickets" data-testid="tab-tickets">Support Tickets</TabsTrigger>
                  <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
                  <TabsTrigger value="webhooks" data-testid="tab-webhooks">Webhooks</TabsTrigger>
                  <TabsTrigger value="voice" data-testid="tab-voice">Voice</TabsTrigger>
                  <TabsTrigger value="openai" data-testid="tab-openai">OpenAI</TabsTrigger>
                  <TabsTrigger value="aligner" data-testid="tab-aligner">Aligner</TabsTrigger>
                  <TabsTrigger value="sheets" data-testid="tab-sheets">Google Sheets</TabsTrigger>
                  <TabsTrigger value="assets" data-testid="tab-assets">Assets</TabsTrigger>
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

              <TabsContent value="webhooks">
                <WebhookManagement />
              </TabsContent>

              <TabsContent value="voice">
                <VoiceSettings />
              </TabsContent>

              <TabsContent value="openai">
                <OpenAIManagement />
              </TabsContent>

              <TabsContent value="aligner">
                <AlignerManagement />
              </TabsContent>

              <TabsContent value="sheets">
                <GoogleSheetsSync />
              </TabsContent>

              <TabsContent value="assets">
                <DriveFolderConfig />
              </TabsContent>

              <TabsContent value="sync">
                <WooCommerceSync />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Right Column - Reminders Widget */}
      <div className="w-80 border-l flex-shrink-0 overflow-auto">
        <RemindersWidget
          trackerSheetId={trackerSheet?.id}
          storeDbSheetId={storeDbSheet?.id}
          userPreferences={userPreferences}
          contextUpdateTrigger={contextUpdateTrigger}
          setContextUpdateTrigger={setContextUpdateTrigger}
          loadDefaultScriptTrigger={loadDefaultScriptTrigger}
          setLoadDefaultScriptTrigger={setLoadDefaultScriptTrigger}
        />
      </div>

      {/* Call History Dialog */}
      <CallHistoryDialog
        open={callHistoryOpen}
        onOpenChange={setCallHistoryOpen}
      />

      {/* Store Details Dialog */}
      {storeDetailsDialog && (
        <StoreDetailsDialog
          open={storeDetailsDialog.open}
          onOpenChange={(open) => setStoreDetailsDialog(open ? storeDetailsDialog : null)}
          row={storeDetailsDialog.row}
          trackerSheetId={trackerSheet?.id}
          storeDbSheetId={storeDbSheet?.id}
          onUpdate={() => {
            refetchClients();
            setContextUpdateTrigger(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}
