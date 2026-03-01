import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsContent } from "@/components/ui/tabs";
import { BarChart3, Users } from "lucide-react";

export function OrgAdminStatsTab(props: any) {
  const p = props;

  return (
    <TabsContent value="stats">
      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-stat-users">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {p.statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-stat-users">
                {p.statsData?.userCount ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stat-clients">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {p.statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-stat-clients">
                {p.statsData?.clientCount ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stat-calls">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {p.statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-stat-calls">
                {p.statsData?.callCount ?? 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
