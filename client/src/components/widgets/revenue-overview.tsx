import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2, TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardSummary {
  totalEarnings: string;
  monthlyAverage: string;
  thisMonthEarnings: string;
  lastMonthEarnings: string;
  projectedEarnings: string;
  bestMonth: {
    month: string;
    earnings: string;
  };
  commissionBreakdown: {
    commission25: string;
    commission10: string;
  };
}

export function RevenueOverviewWidget() {
  const { data, isLoading, error } = useQuery<DashboardSummary>({
    queryKey: ['/api/analytics/dashboard-summary'],
  });

  if (isLoading) {
    return (
      <Card className="h-full min-h-[300px]">
        <CardHeader className="drag-handle cursor-move pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription className="mt-1.5">Total earnings and monthly averages</CardDescription>
            </div>
            <div className="flex items-start gap-2">
              <div className="flex flex-col items-end gap-1">
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Settings2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="h-full min-h-[300px]">
        <CardHeader className="drag-handle cursor-move pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription className="mt-1.5">Total earnings and monthly averages</CardDescription>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-32" />
              <Settings2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive" data-testid="error-revenue-overview">
            Failed to load revenue data
          </p>
        </CardContent>
      </Card>
    );
  }

  const monthOverMonthChange = parseFloat(data.lastMonthEarnings) > 0
    ? ((parseFloat(data.thisMonthEarnings) - parseFloat(data.lastMonthEarnings)) / parseFloat(data.lastMonthEarnings)) * 100
    : 0;
  const isPositiveChange = monthOverMonthChange >= 0;

  return (
    <Card className="h-full min-h-[300px]">
      <CardHeader className="drag-handle cursor-move pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription className="mt-1.5">Total earnings and monthly averages</CardDescription>
          </div>
          <div className="flex items-start gap-2">
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-baseline gap-1.5">
                <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-2xl font-bold whitespace-nowrap" data-testid="text-total-earnings">
                  ${parseFloat(data.totalEarnings || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground whitespace-nowrap">Total Earnings</p>
            </div>
            <Settings2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Secondary Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Monthly Average */}
          <div className="space-y-1">
            <div className="text-xl font-semibold" data-testid="text-monthly-average">
              ${parseFloat(data.monthlyAverage || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Monthly Avg</p>
          </div>

          {/* This Month vs Last */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-xl font-semibold" data-testid="text-this-month">
                ${parseFloat(data.thisMonthEarnings || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              ${parseFloat(data.projectedEarnings || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Projected (EOY)</p>
          </div>

          {/* Best Month */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-xl font-semibold" data-testid="text-best-month-amount">
                ${parseFloat(data.bestMonth?.earnings || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-best-month-name">
              Best: {data.bestMonth?.month || 'N/A'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
