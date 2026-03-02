import type { DateRange } from "react-day-picker";
import type { Client } from "@shared/schema";

export const isClientInTimeRange = (client: Client, timeRange: { from?: Date; to?: Date } | undefined): boolean => {
  if (!timeRange?.from && !timeRange?.to) return true;

  const claimDate = client.claimDate ? new Date(client.claimDate) : null;
  const lastOrderDate = client.lastOrderDate ? new Date(client.lastOrderDate) : null;

  const claimInRange = !!(
    claimDate &&
    (!timeRange?.from || claimDate >= timeRange.from) &&
    (!timeRange?.to || claimDate <= timeRange.to)
  );

  const orderInRange = !!(
    lastOrderDate &&
    (!timeRange?.from || lastOrderDate >= timeRange.from) &&
    (!timeRange?.to || lastOrderDate <= timeRange.to)
  );

  return claimInRange || orderInRange;
};

export const getTimePeriodDates = (timePeriod: string, customDateRange: DateRange | undefined) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (timePeriod) {
    case "today":
      return { from: today, to: now };
    case "week": {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { from: weekAgo, to: now };
    }
    case "month": {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return { from: monthAgo, to: now };
    }
    case "quarter": {
      const quarterAgo = new Date(today);
      quarterAgo.setMonth(quarterAgo.getMonth() - 3);
      return { from: quarterAgo, to: now };
    }
    case "year": {
      const yearAgo = new Date(today);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return { from: yearAgo, to: now };
    }
    case "custom":
      return customDateRange;
    default:
      return { from: undefined, to: undefined };
  }
};
