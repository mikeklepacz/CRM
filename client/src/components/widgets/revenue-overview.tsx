import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2, TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardSummary {
  totalEarnings: number;
  monthlyAverage: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  projectedEarnings: number;
  bestMonth: {
    month: string;
    earnings: number;
  };
  earningsBreakdown: {
    tier25Percent: number;
    tier10Percent: number;
  };
  activeClients: number;
  totalClients: number;
}

export function RevenueOverviewWidget() {
  const { data, isLoading, error } = useQuery<{ summary: DashboardSummary }>({
    queryKey: ['/api/analytics/dashboard-summary'],
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="drag-handle cursor-move">
          <CardTitle className="flex items-center justify-between">
            Revenue Overview
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
          <CardDescription>Total earnings and monthly averages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="h-full">
        <CardHeader className="drag-handle cursor-move">
          <CardTitle className="flex items-center justify-between">
            Revenue Overview
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
          <CardDescription>Total earnings and monthly averages</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive" data-testid="error-revenue-overview">
            Failed to load revenue data
          </p>
        </CardContent>
      </Card>
    );
  }

  const { summary } = data;
  const monthOverMonthChange = summary.lastMonthEarnings > 0
    ? ((summary.thisMonthEarnings - summary.lastMonthEarnings) / summary.lastMonthEarnings) * 100
    : 0;
  const isPositiveChange = monthOverMonthChange >= 0;

  return (
    <Card className="h-full">
      <CardHeader className="drag-handle cursor-move">
        <CardTitle className="flex items-center justify-between">
          Revenue Overview
          <Settings2 className="h-4 w-4 text-muted-foreground" />
        </CardTitle>
        <CardDescription>Total earnings and monthly averages</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Earnings - Primary Metric */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <span className="text-3xl font-bold" data-testid="text-total-earnings">
              ${summary.totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Total Earnings</p>
        </div>

        {/* Secondary Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Monthly Average */}
          <div className="space-y-1">
            <div className="text-xl font-semibold" data-testid="text-monthly-average">
              ${summary.monthlyAverage.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Monthly Avg</p>
          </div>

          {/* This Month vs Last */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-xl font-semibold" data-testid="text-this-month">
                ${summary.thisMonthEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {isPositiveChange ? (
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              This Month
              <span className={`ml-1 ${isPositiveChange ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isPositiveChange ? '+' : ''}{monthOverMonthChange.toFixed(1)}%
              </span>
            </p>
          </div>

          {/* Projected Earnings */}
          <div className="space-y-1">
            <div className="text-xl font-semibold" data-testid="text-projected-earnings">
              ${summary.projectedEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Projected (EOY)</p>
          </div>

          {/* Best Month */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-xl font-semibold" data-testid="text-best-month-amount">
                ${summary.bestMonth.earnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-best-month-name">
              Best: {summary.bestMonth.month}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
