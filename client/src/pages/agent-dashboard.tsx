import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClientFilters } from "@/components/client-filters";
import { ClientsTable } from "@/components/clients-table";
import { Users, DollarSign, TrendingUp, Calendar } from "lucide-react";
import type { Client } from "@shared/schema";

export default function AgentDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [search, setSearch] = useState("");
  const [state, setState] = useState("all");
  const [status, setStatus] = useState("all");
  const [inactivityDays, setInactivityDays] = useState("all");

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients/my"],
  });

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

  const states = Array.from(new Set(
    clients
      .map(c => c.data?.['State'] || c.data?.['state'])
      .filter(Boolean)
  )).sort();

  const filteredClients = clients.filter(client => {
    if (search) {
      const searchLower = search.toLowerCase();
      const dataStr = JSON.stringify(client.data).toLowerCase();
      if (!dataStr.includes(searchLower)) return false;
    }
    if (state !== "all" && client.data?.['State'] !== state && client.data?.['state'] !== state) return false;
    if (status !== "all" && client.status !== status) return false;
    if (inactivityDays !== "all") {
      if (!client.lastOrderDate) return true;
      const daysSinceOrder = Math.floor((Date.now() - new Date(client.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceOrder < parseInt(inactivityDays)) return false;
    }
    return true;
  });

  const totalSales = clients.reduce((sum, c) => sum + parseFloat(c.totalSales || '0'), 0);
  const totalCommission = clients.reduce((sum, c) => sum + parseFloat(c.commissionTotal || '0'), 0);
  const inactive90Days = clients.filter(c => {
    if (!c.lastOrderDate) return false;
    const days = Math.floor((Date.now() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
    return days >= 90;
  }).length;

  const clearFilters = () => {
    setSearch("");
    setState("all");
    setStatus("all");
    setInactivityDays("all");
  };

  const quickFilter = (days: string) => {
    setInactivityDays(days);
    setSearch("");
    setState("all");
    setStatus("all");
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">My Dashboard</h2>
        <p className="text-muted-foreground">Track your claimed clients and commissions</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-my-clients">{clients.length}</div>
            <p className="text-xs text-muted-foreground">
              Claimed by you
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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

      <Card>
        <CardHeader>
          <CardTitle>Quick Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={inactivityDays === "90" ? "default" : "outline"}
              size="sm"
              onClick={() => quickFilter("90")}
              data-testid="button-filter-90"
            >
              90+ Days Inactive
            </Button>
            <Button
              variant={inactivityDays === "180" ? "default" : "outline"}
              size="sm"
              onClick={() => quickFilter("180")}
              data-testid="button-filter-180"
            >
              180+ Days Inactive
            </Button>
            <Button
              variant={inactivityDays === "365" ? "default" : "outline"}
              size="sm"
              onClick={() => quickFilter("365")}
              data-testid="button-filter-365"
            >
              365+ Days Inactive
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <ClientFilters
          search={search}
          onSearchChange={setSearch}
          state={state}
          onStateChange={setState}
          status={status}
          onStatusChange={setStatus}
          assignedAgent="all"
          onAssignedAgentChange={() => {}}
          inactivityDays={inactivityDays}
          onInactivityDaysChange={setInactivityDays}
          onClearFilters={clearFilters}
          states={states}
          showAgentFilter={false}
        />

        <ClientsTable
          clients={filteredClients}
          currentUser={user}
          isLoading={clientsLoading}
        />
      </div>
    </div>
  );
}
