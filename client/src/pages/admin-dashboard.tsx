import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientFilters } from "@/components/client-filters";
import { ClientsTable } from "@/components/clients-table";
import { CsvUpload } from "@/components/csv-upload";
import { WooCommerceSync } from "@/components/woocommerce-sync";
import { GoogleSheetsSync } from "@/components/google-sheets-sync";
import { Users, DollarSign, FileSpreadsheet, TrendingUp } from "lucide-react";
import type { Client, User } from "@shared/schema";

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [search, setSearch] = useState("");
  const [state, setState] = useState("all");
  const [status, setStatus] = useState("all");
  const [assignedAgent, setAssignedAgent] = useState("all");
  const [inactivityDays, setInactivityDays] = useState("all");

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: agents = [] } = useQuery<User[]>({
    queryKey: ["/api/users/agents"],
  });

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
    if (assignedAgent === "unassigned" && client.assignedAgent) return false;
    if (assignedAgent !== "all" && assignedAgent !== "unassigned" && client.assignedAgent !== assignedAgent) return false;
    if (inactivityDays !== "all") {
      if (!client.lastOrderDate) return true;
      const daysSinceOrder = Math.floor((Date.now() - new Date(client.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceOrder < parseInt(inactivityDays)) return false;
    }
    return true;
  });

  const totalSales = clients.reduce((sum, c) => sum + parseFloat(c.totalSales || '0'), 0);
  const totalCommission = clients.reduce((sum, c) => sum + parseFloat(c.commissionTotal || '0'), 0);
  const claimedClients = clients.filter(c => c.assignedAgent).length;

  const clearFilters = () => {
    setSearch("");
    setState("all");
    setStatus("all");
    setAssignedAgent("all");
    setInactivityDays("all");
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Admin Dashboard</h2>
        <p className="text-muted-foreground">Manage clients, users, and track overall performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-total-clients">{clients.length}</div>
            <p className="text-xs text-muted-foreground">
              {claimedClients} claimed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-total-sales">
              ${totalSales.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Owed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-total-commission">
              ${totalCommission.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              To all agents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-active-agents">
              {agents.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Sales team members
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clients" className="space-y-6">
        <TabsList>
          <TabsTrigger value="clients" data-testid="tab-clients">Clients</TabsTrigger>
          <TabsTrigger value="sheets" data-testid="tab-sheets">Google Sheets</TabsTrigger>
          <TabsTrigger value="upload" data-testid="tab-upload">CSV Upload</TabsTrigger>
          <TabsTrigger value="sync" data-testid="tab-sync">WooCommerce Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-6">
          <ClientFilters
            search={search}
            onSearchChange={setSearch}
            state={state}
            onStateChange={setState}
            status={status}
            onStatusChange={setStatus}
            assignedAgent={assignedAgent}
            onAssignedAgentChange={setAssignedAgent}
            inactivityDays={inactivityDays}
            onInactivityDaysChange={setInactivityDays}
            onClearFilters={clearFilters}
            agents={agents}
            states={states}
          />

          <ClientsTable
            clients={filteredClients}
            currentUser={user}
            isLoading={clientsLoading}
          />
        </TabsContent>

        <TabsContent value="sheets">
          <GoogleSheetsSync />
        </TabsContent>

        <TabsContent value="upload">
          <CsvUpload />
        </TabsContent>

        <TabsContent value="sync">
          <WooCommerceSync />
        </TabsContent>
      </Tabs>
    </div>
  );
}
