import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
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
  atRiskRevenue: number;
  atRiskClients: number;
}

export function CommissionBreakdownWidget() {
  const { data, isLoading, error } = useQuery<{ breakdown: CommissionBreakdown }>({
    queryKey: ['/api/analytics/commission-breakdown'],
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="drag-handle cursor-move">
          <CardTitle>Commission Breakdown</CardTitle>
          <CardDescription>25% vs 10% tier earnings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data || !data.breakdown || !data.breakdown.tier25Percent || !data.breakdown.tier10Percent) {
    return (
      <Card className="h-full">
        <CardHeader className="drag-handle cursor-move">
          <CardTitle>Commission Breakdown</CardTitle>
          <CardDescription>25% vs 10% tier earnings</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive" data-testid="error-commission-breakdown">
            Failed to load commission data
          </p>
        </CardContent>
      </Card>
    );
  }

  const { breakdown } = data;
  const totalEarnings = (breakdown.tier25Percent?.earnings || 0) + (breakdown.tier10Percent?.earnings || 0);
  const tier25Percentage = totalEarnings > 0 ? (breakdown.tier25Percent.earnings / totalEarnings) * 100 : 0;

  return (
    <Card className="h-full">
      <CardHeader className="drag-handle cursor-move">
        <CardTitle>Commission Breakdown</CardTitle>
        <CardDescription>25% vs 10% tier earnings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 25% Tier */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="default" data-testid="badge-tier-25">25% Tier</Badge>
              <span className="text-xs text-muted-foreground">
                {breakdown.tier25Percent.clients} {breakdown.tier25Percent.clients === 1 ? 'client' : 'clients'}
              </span>
            </div>
            <span className="text-lg font-semibold" data-testid="text-tier-25-earnings">
              ${breakdown.tier25Percent.earnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${tier25Percentage}%` }}
            />
          </div>
        </div>

        {/* 10% Tier */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" data-testid="badge-tier-10">10% Tier</Badge>
              <span className="text-xs text-muted-foreground">
                {breakdown.tier10Percent.clients} {breakdown.tier10Percent.clients === 1 ? 'client' : 'clients'}
              </span>
            </div>
            <span className="text-lg font-semibold" data-testid="text-tier-10-earnings">
              ${breakdown.tier10Percent.earnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-secondary rounded-full transition-all"
              style={{ width: `${100 - tier25Percentage}%` }}
            />
          </div>
        </div>

        {/* At-Risk Revenue Alert */}
        {breakdown.atRiskRevenue > 0 && (
          <div className="mt-4 p-3 bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-destructive" data-testid="text-at-risk-warning">
                  At-Risk Revenue: ${breakdown.atRiskRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {breakdown.atRiskClients} {breakdown.atRiskClients === 1 ? 'client' : 'clients'} approaching 6-month tier change
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
