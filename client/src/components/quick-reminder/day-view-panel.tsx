import { format } from "date-fns";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatReminderTime } from "./utils";

interface QuickReminderDayViewPanelProps {
  date?: Date;
  dateReminders: any;
  isLoadingReminders: boolean;
  remindersError: any;
  refetchReminders: () => void;
  timeFormat: string | null;
}

export function QuickReminderDayViewPanel({
  date,
  dateReminders,
  isLoadingReminders,
  remindersError,
  refetchReminders,
  timeFormat,
}: QuickReminderDayViewPanelProps) {
  return (
    <div className="p-4 rounded-md bg-primary/10 border border-primary/20 max-h-[240px] overflow-y-auto" data-testid="day-view-panel">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Clock className="h-4 w-4" />
          <span>{date ? `Reminders for ${format(date, "MMMM do")}` : "Select a date"}</span>
        </div>
        {date && (
          <div className="space-y-1.5 mt-3">
            {isLoadingReminders ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Loading reminders...</div>
              </div>
            ) : remindersError ? (
              <div className="text-center py-4">
                <p className="text-sm text-destructive mb-2">Failed to load reminders</p>
                <Button variant="outline" size="sm" onClick={refetchReminders} data-testid="button-retry-reminders">
                  Retry
                </Button>
              </div>
            ) : dateReminders?.reminders && dateReminders.reminders.length > 0 ? (
              dateReminders.reminders.map((reminder: any) => (
                <div key={reminder.id} className="flex items-start gap-2 text-sm p-2 rounded bg-background/50" data-testid={`reminder-item-${reminder.id}`}>
                  <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">{formatReminderTime(reminder.scheduledTime, timeFormat)}</div>
                    <div className="text-xs text-muted-foreground truncate">{reminder.title}</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No reminders scheduled</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
