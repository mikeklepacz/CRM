import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientsTable } from "@/components/clients-table";
import { RemindersWidget } from "@/components/widgets/reminders";
import { Users, DollarSign, TrendingUp, Calendar, Search, CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { Client } from "@shared/schema";
import type { DateRange } from "react-day-picker";

interface Status {
  id: string;
  name: string;
  color: string;
}

export default function AgentDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [inactivityDays, setInactivityDays] = useState("all");
  const [timePeriod, setTimePeriod] = useState("all");
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients/my"],
  });

  const { data: statusesResponse } = useQuery<{ statuses: Status[] }>({
    queryKey: ["/api/statuses"],
  });
  
  const statuses = statusesResponse?.statuses || [];

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
      const clientStatus = client.data?.['Status'] || client.data?.['status'];
      if (clientStatus !== status) return false;
    }
    
    // Inactivity filter
    if (inactivityDays !== "all") {
      if (!client.lastOrderDate) return true;
      const daysSinceOrder = Math.floor((Date.now() - new Date(client.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceOrder < parseInt(inactivityDays)) return false;
    }
    
    // Time period filter
    if (timeFilter.from || timeFilter.to) {
      const claimDate = client.claimDate ? new Date(client.claimDate) : null;
      const lastOrderDate = client.lastOrderDate ? new Date(client.lastOrderDate) : null;
      
      // Filter by claim date or last order date
      const relevantDate = lastOrderDate || claimDate;
      if (!relevantDate) return false;
      
      if (timeFilter.from && relevantDate < timeFilter.from) return false;
      if (timeFilter.to && relevantDate > timeFilter.to) return false;
    }
    
    return true;
  });

  // Calculate stats from filtered clients based on time period
  const statsClients = clients.filter(client => {
    if (timeFilter.from || timeFilter.to) {
      const claimDate = client.claimDate ? new Date(client.claimDate) : null;
      const lastOrderDate = client.lastOrderDate ? new Date(client.lastOrderDate) : null;
      const relevantDate = lastOrderDate || claimDate;
      if (!relevantDate) return false;
      if (timeFilter.from && relevantDate < timeFilter.from) return false;
      if (timeFilter.to && relevantDate > timeFilter.to) return false;
    }
    return true;
  });

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
    setCustomDateRange({});
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left Column - Main Dashboard Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 space-y-6">
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
                <div className="text-2xl font-semibold" data-testid="text-inactive-clients">
                  {inactive90Days}
                </div>
                <p className="text-xs text-muted-foreground">
                  90+ days inactive
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Compact Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 p-4 border rounded-lg bg-card">
            {/* Time Period Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Period:</span>
              <Button
                variant={timePeriod === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimePeriod("all")}
                data-testid="button-period-all"
              >
                All Time
              </Button>
              <Button
                variant={timePeriod === "today" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimePeriod("today")}
                data-testid="button-period-today"
              >
                Today
              </Button>
              <Button
                variant={timePeriod === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimePeriod("week")}
                data-testid="button-period-week"
              >
                Week
              </Button>
              <Button
                variant={timePeriod === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimePeriod("month")}
                data-testid="button-period-month"
              >
                Month
              </Button>
              <Button
                variant={timePeriod === "quarter" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimePeriod("quarter")}
                data-testid="button-period-quarter"
              >
                Quarter
              </Button>
              <Button
                variant={timePeriod === "year" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimePeriod("year")}
                data-testid="button-period-year"
              >
                Year
              </Button>
              
              {/* Custom Date Range Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={timePeriod === "custom" ? "default" : "outline"}
                    size="sm"
                    data-testid="button-period-custom"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {timePeriod === "custom" && customDateRange.from
                      ? `${format(customDateRange.from, "MMM d")}${customDateRange.to ? ` - ${format(customDateRange.to, "MMM d")}` : ""}`
                      : "Custom"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="range"
                    selected={customDateRange}
                    onSelect={(range: DateRange | undefined) => {
                      setCustomDateRange(range || {});
                      if (range?.from) {
                        setTimePeriod("custom");
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>

            {/* Status Dropdown */}
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]" data-testid="select-status">
                <SelectValue placeholder="Status" />
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

            {/* Inactivity Filter */}
            <Select value={inactivityDays} onValueChange={setInactivityDays}>
              <SelectTrigger className="w-[200px]" data-testid="select-inactivity">
                <SelectValue placeholder="Inactivity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                <SelectItem value="90">Not ordered in 90 days</SelectItem>
                <SelectItem value="180">Not ordered in 180 days</SelectItem>
                <SelectItem value="365">Not ordered in 365 days</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              data-testid="button-clear-filters"
            >
              Clear All
            </Button>
          </div>

          {/* Client Table */}
          <ClientsTable
            clients={filteredClients}
            currentUser={user}
            isLoading={clientsLoading}
          />
        </div>
      </div>

      {/* Right Column - Reminders Widget (hidden on mobile/tablet, visible on large screens) */}
      <div className="hidden lg:block lg:w-96 border-l overflow-y-auto">
        <div className="p-4 h-full">
          <RemindersWidget 
            onPhoneClick={(storeIdentifier, phoneNumber) => {
              console.log('[AgentDashboard] onPhoneClick called:', { storeIdentifier, phoneNumber });
              const params = new URLSearchParams({ store: storeIdentifier });
              if (phoneNumber) {
                params.append('phone', phoneNumber);
              }
              setLocation(`/clients?${params.toString()}`);
            }}
          />
        </div>
      </div>
    </div>
  );
}
