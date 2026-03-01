import { format } from "date-fns";
import { Users, DollarSign, TrendingUp, Calendar, CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface DashboardMetricsSectionProps {
  timePeriod: string;
  customDateRange: DateRange | undefined;
  statsClientsCount: number;
  totalSales: number;
  totalCommission: number;
  inactive90Days: number;
  onTimePeriodChange: (value: string) => void;
  onCustomDateRangeChange: (value: DateRange | undefined) => void;
}

export function DashboardMetricsSection({
  timePeriod,
  customDateRange,
  statsClientsCount,
  totalSales,
  totalCommission,
  inactive90Days,
  onTimePeriodChange,
  onCustomDateRangeChange,
}: DashboardMetricsSectionProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle>Performance Metrics</CardTitle>
          <p className="text-sm text-muted-foreground">Track your stats for the selected period</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={timePeriod} onValueChange={onTimePeriodChange}>
            <SelectTrigger className="w-[140px]" data-testid="select-time-period">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="quarter">Last 90 Days</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {timePeriod === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-custom-date">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDateRange?.from ? (
                    customDateRange.to ? (
                      <>
                        {format(customDateRange.from, "LLL dd, y")} - {format(customDateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(customDateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={customDateRange?.from}
                  selected={customDateRange}
                  onSelect={onCustomDateRangeChange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold" data-testid="text-my-clients">{statsClientsCount}</div>
              <p className="text-xs text-muted-foreground">Claimed by you</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold" data-testid="text-my-sales">${totalSales.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">From your clients</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold" data-testid="text-my-commission">${totalCommission.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Your earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Needs Follow-up</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold" data-testid="text-needs-followup">{inactive90Days}</div>
              <p className="text-xs text-muted-foreground">90+ days inactive</p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
