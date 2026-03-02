import { format, parseISO } from "date-fns";
import { Building2, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BlockedDay } from "./types";

interface UpcomingBlockedDaysSectionProps {
  deletePending: boolean;
  getCustomDateId: (dateStr: string) => string | undefined;
  isCustomDate: (dateStr: string) => boolean;
  isLoading: boolean;
  onDelete: (id: string) => void;
  upcomingBlockedDays: BlockedDay[];
}

export function UpcomingBlockedDaysSection({
  deletePending,
  getCustomDateId,
  isCustomDate,
  isLoading,
  onDelete,
  upcomingBlockedDays,
}: UpcomingBlockedDaysSectionProps) {
  return (
    <div>
      <h3 className="font-medium mb-4">Upcoming Blocked Days (Next 90 Days)</h3>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : upcomingBlockedDays.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No blocked days in the next 90 days</p>
      ) : (
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {upcomingBlockedDays.map((day) => {
              const isCustom = isCustomDate(day.date);
              const customId = isCustom ? getCustomDateId(day.date) : undefined;

              return (
                <div
                  key={day.date}
                  className="flex items-center justify-between p-3 rounded-md border bg-card"
                  data-testid={`blocked-day-${day.date}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="font-medium" data-testid={`text-date-${day.date}`}>
                        {format(parseISO(day.date), "EEEE, MMMM d, yyyy")}
                      </span>
                      <span className="text-sm text-muted-foreground" data-testid={`text-reason-${day.date}`}>
                        {day.reason}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCustom ? (
                      <>
                        <Badge variant="secondary" data-testid={`badge-custom-${day.date}`}>
                          Custom
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => customId && onDelete(customId)}
                          disabled={deletePending}
                          data-testid={`button-delete-${day.date}`}
                        >
                          {deletePending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </>
                    ) : (
                      <Badge variant="outline" className="gap-1" data-testid={`badge-federal-${day.date}`}>
                        <Building2 className="h-3 w-3" />
                        Federal
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
