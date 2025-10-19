import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface CommissionBreakdown {
  tier25Percent: {
    earnings: number;
    clients: number;
  };
  tier10Percent: {
    earnings: number;
    clients: number;
  };
  clientsNearingTierChange: Array<{
    name: string;
    daysUntilChange: number;
    currentRevenue: number;
  }>;
}

export function CommissionStatusWidget() {
  const { data, isLoading, error } = useQuery<{ breakdown: CommissionBreakdown }>({
    queryKey: ['/api/analytics/commission-breakdown'],
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="drag-handle cursor-move">
          <CardTitle className="flex items-center justify-between">
            Commission Status
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
          <CardDescription>Clients by commission tier</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data || !data.breakdown || !data.breakdown.tier25Percent || !data.breakdown.tier10Percent) {
    return (
      <Card className="h-full">
        <CardHeader className="drag-handle cursor-move">
          <CardTitle className="flex items-center justify-between">
            Commission Status
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
          <CardDescription>Clients by commission tier</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive" data-testid="error-commission-status">
            Failed to load commission status
          </p>
        </CardContent>
      </Card>
    );
  }

  const { breakdown } = data;
  const tier25Clients = breakdown?.tier25Percent?.clients || 0;
  const tier10Clients = breakdown?.tier10Percent?.clients || 0;
  const totalClients = tier25Clients + tier10Clients;

  return (
    <Card className="h-full">
      <CardHeader className="drag-handle cursor-move">
        <CardTitle className="flex items-center justify-between">
          Commission Status
          <Settings2 className="h-4 w-4 text-muted-foreground" />
        </CardTitle>
        <CardDescription>Clients by commission tier</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tier Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-md">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">25% Tier</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-tier-25-clients">
              {tier25Clients}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalClients > 0 ? ((tier25Clients / totalClients) * 100).toFixed(0) : 0}% of clients
            </p>
          </div>

          <div className="p-3 bg-secondary/50 border border-border rounded-md">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">10% Tier</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-tier-10-clients">
              {tier10Clients}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalClients > 0 ? ((tier10Clients / totalClients) * 100).toFixed(0) : 0}% of clients
            </p>
          </div>
        </div>

        {/* Upcoming Tier Changes */}
        {breakdown?.clientsNearingTierChange && breakdown.clientsNearingTierChange.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Upcoming Tier Changes</span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {breakdown.clientsNearingTierChange.slice(0, 3).map((client, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs"
                  data-testid={`client-nearing-change-${index}`}
                >
                  <span className="font-medium truncate flex-1">{client.name}</span>
                  <Badge variant="outline" className="ml-2">
                    {client.daysUntilChange}d
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!breakdown?.clientsNearingTierChange || breakdown.clientsNearingTierChange.length === 0) && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No tier changes in the next 30 days
          </div>
        )}
      </CardContent>
    </Card>
  );
}
