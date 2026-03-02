import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsContent } from "@/components/ui/tabs";
import { BarChart3, Building2, Check, Users } from "lucide-react";

export function SuperAdminMetricsTab(props: any) {
  const p = props;

  return (
    <TabsContent value="metrics">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-metric-tenants">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {p.metricsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{p.metricsData?.totalTenants ?? 0}</div>}
          </CardContent>
        </Card>

        <Card data-testid="card-metric-users">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {p.metricsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{p.metricsData?.totalUsers ?? 0}</div>}
          </CardContent>
        </Card>

        <Card data-testid="card-metric-clients">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {p.metricsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{p.metricsData?.totalClients ?? 0}</div>}
          </CardContent>
        </Card>

        <Card data-testid="card-metric-active">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {p.metricsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{p.metricsData?.activeTenants ?? 0}</div>}
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
