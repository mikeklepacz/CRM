import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PortfolioMetrics {
  activeClients: number;
  totalClients: number;
  avgRevenuePerClient: string;
  repeatOrderRate: string;
}

export function PortfolioMetricsWidget() {
  const { data, isLoading, error} = useQuery<PortfolioMetrics>({
    queryKey: ['/api/analytics/portfolio-metrics'],
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="drag-handle cursor-move">
          <CardTitle>Client Portfolio</CardTitle>
          <CardDescription>Active clients and performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="h-full">
        <CardHeader className="drag-handle cursor-move">
          <CardTitle>Client Portfolio</CardTitle>
          <CardDescription>Active clients and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive" data-testid="error-portfolio-metrics">
            Failed to load portfolio data
          </p>
        </CardContent>
      </Card>
    );
  }

  const activePercentage = data.totalClients > 0 
    ? (data.activeClients / data.totalClients) * 100 
    : 0;

  return (
    <Card className="h-full">
      <CardHeader className="drag-handle cursor-move">
        <CardTitle>Client Portfolio</CardTitle>
        <CardDescription>Active clients and performance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active vs Total Clients */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Active Clients</span>
            </div>
            <span className="text-2xl font-bold" data-testid="text-active-clients">
              {data.activeClients}
              <span className="text-sm text-muted-foreground font-normal"> / {data.totalClients}</span>
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${activePercentage}%` }}
              data-testid="progress-active-clients"
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {activePercentage.toFixed(1)}% active
          </p>
        </div>

        {/* Average Revenue Per Client */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Avg Revenue/Client</span>
          </div>
          <span className="text-lg font-semibold" data-testid="text-avg-revenue-per-client">
            ${parseFloat(data.avgRevenuePerClient).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Repeat Order Rate */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Repeat Order Rate</span>
          </div>
          <span className="text-lg font-semibold" data-testid="text-repeat-order-rate">
            {parseFloat(data.repeatOrderRate).toFixed(1)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
