import { Calendar as CalendarLucide } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddCustomDateSection } from "@/components/holiday-calendar/add-custom-date-section";
import { HolidayToggleSections } from "@/components/holiday-calendar/holiday-toggle-sections";
import { UpcomingBlockedDaysSection } from "@/components/holiday-calendar/upcoming-blocked-days-section";
import { useHolidayCalendar } from "@/components/holiday-calendar/use-holiday-calendar";

export function HolidayCalendar() {
  const {
    addDateMutation,
    calendarOpen,
    deleteDateMutation,
    extendedWindows,
    federalHolidays,
    getCustomDateId,
    handleAddDate,
    handleToggle,
    isCustomDate,
    isLoading,
    reason,
    selectedDate,
    setCalendarOpen,
    setReason,
    setSelectedDate,
    toggleHolidayMutation,
    upcomingBlockedDays,
  } = useHolidayCalendar();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarLucide className="h-5 w-5" />
          Holiday Calendar
        </CardTitle>
        <CardDescription>
          Manage blocked dates for email and call outreach. Toggle holidays on/off based on your business needs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <HolidayToggleSections
          extendedWindows={extendedWindows}
          federalHolidays={federalHolidays}
          onToggle={handleToggle}
          pending={toggleHolidayMutation.isPending}
        />

        <AddCustomDateSection
          calendarOpen={calendarOpen}
          pending={addDateMutation.isPending}
          reason={reason}
          selectedDate={selectedDate}
          setCalendarOpen={setCalendarOpen}
          setReason={setReason}
          setSelectedDate={setSelectedDate}
          onAddDate={handleAddDate}
        />

        <UpcomingBlockedDaysSection
          deletePending={deleteDateMutation.isPending}
          getCustomDateId={getCustomDateId}
          isCustomDate={isCustomDate}
          isLoading={isLoading}
          onDelete={(id) => deleteDateMutation.mutate(id)}
          upcomingBlockedDays={upcomingBlockedDays}
        />

        <div className="text-sm text-muted-foreground border-t pt-4">
          <p className="font-medium mb-2">How Holiday Blocking Works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>ON</strong> = Outreach blocked on that day (no emails or calls sent)
            </li>
            <li>
              <strong>OFF</strong> = Outreach allowed on that day (emails and calls proceed normally)
            </li>
            <li>Custom blocked dates are always enforced and cannot be toggled</li>
            <li>Changes take effect immediately for future scheduled emails</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
