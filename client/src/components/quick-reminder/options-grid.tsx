import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimeSpinner } from "@/components/time-spinner";
import { formatTimezoneDisplay } from "@shared/timezoneUtils";
import { QuickReminderDayViewPanel } from "./day-view-panel";

interface QuickReminderOptionsGridProps {
  date?: Date;
  time: string;
  timeFormat: string | null;
  customerTimezone: string | null;
  useCustomerTimezone: boolean;
  timePreview: string | null;
  calendarReminders: Array<{ method: string; minutes: number }>;
  dateReminders: any;
  isLoadingReminders: boolean;
  remindersError: any;
  refetchReminders: () => void;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
  onUseCustomerTimezoneChange: (value: boolean) => void;
  onCalendarRemindersChange: (value: Array<{ method: string; minutes: number }>) => void;
}

export function QuickReminderOptionsGrid({
  date,
  time,
  timeFormat,
  customerTimezone,
  useCustomerTimezone,
  timePreview,
  calendarReminders,
  dateReminders,
  isLoadingReminders,
  remindersError,
  refetchReminders,
  onDateChange,
  onTimeChange,
  onUseCustomerTimezoneChange,
  onCalendarRemindersChange,
}: QuickReminderOptionsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-select-date">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "MMMM do, yyyy") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={onDateChange}
                initialFocus
                disabled={(day) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return day < today;
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Time</Label>
          <TimeSpinner value={time} onChange={onTimeChange} format={timeFormat === "24hr" ? "24hr" : "12hr"} />
        </div>

        <div className="space-y-3 pt-2 border-t">
          <Label className="text-sm font-medium">Calendar Reminders</Label>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Reminder Times</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { value: 0, label: "At event time" },
                { value: 5, label: "5 mins before" },
                { value: 10, label: "10 mins before" },
                { value: 15, label: "15 mins before" },
                { value: 30, label: "30 mins before" },
                { value: 60, label: "1 hour before" },
              ].map(({ value, label }) => {
                const isChecked = calendarReminders.some((r) => r.minutes === value);
                return (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`quick-reminder-time-${value}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          let methods = Array.from(new Set(calendarReminders.map((r) => r.method))) as ("popup" | "email")[];
                          if (methods.length === 0) methods = ["popup"];
                          const newReminders = [...calendarReminders];
                          methods.forEach((method) => {
                            if (!newReminders.some((r) => r.minutes === value && r.method === method)) {
                              newReminders.push({ method, minutes: value });
                            }
                          });
                          onCalendarRemindersChange(newReminders);
                        } else {
                          onCalendarRemindersChange(calendarReminders.filter((r) => r.minutes !== value));
                        }
                      }}
                      data-testid={`checkbox-quick-reminder-time-${value}`}
                    />
                    <Label htmlFor={`quick-reminder-time-${value}`} className="text-xs font-normal cursor-pointer">
                      {label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {customerTimezone && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-customer-timezone"
                checked={useCustomerTimezone}
                onCheckedChange={(checked) => onUseCustomerTimezoneChange(!!checked)}
                data-testid="checkbox-customer-timezone"
              />
              <Label htmlFor="use-customer-timezone" className="text-sm font-normal cursor-pointer">
                Use customer timezone ({formatTimezoneDisplay(customerTimezone)})
              </Label>
            </div>
            {timePreview && useCustomerTimezone && (
              <p className="text-sm text-muted-foreground" data-testid="timezone-preview">
                {timePreview}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium">Reminder Type</Label>
          <div className="flex gap-4">
            {(["popup", "email"] as const).map((method) => {
              const isChecked = calendarReminders.some((r) => r.method === method);
              return (
                <div key={method} className="flex items-center space-x-2">
                  <Checkbox
                    id={`quick-reminder-method-${method}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        let times = Array.from(new Set(calendarReminders.map((r) => r.minutes)));
                        if (times.length === 0) times = [10];
                        const newReminders = [...calendarReminders];
                        times.forEach((minutes) => {
                          if (!newReminders.some((r) => r.minutes === minutes && r.method === method)) {
                            newReminders.push({ method, minutes });
                          }
                        });
                        onCalendarRemindersChange(newReminders);
                      } else {
                        onCalendarRemindersChange(calendarReminders.filter((r) => r.method !== method));
                      }
                    }}
                    data-testid={`checkbox-quick-reminder-${method}`}
                  />
                  <Label htmlFor={`quick-reminder-method-${method}`} className="text-sm font-normal cursor-pointer">
                    {method === "popup" ? "Popup" : "Email"}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>

        <QuickReminderDayViewPanel
          date={date}
          dateReminders={dateReminders}
          isLoadingReminders={isLoadingReminders}
          remindersError={remindersError}
          refetchReminders={refetchReminders}
          timeFormat={timeFormat}
        />
      </div>
    </div>
  );
}
