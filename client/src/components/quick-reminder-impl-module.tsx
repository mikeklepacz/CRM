import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { detectTimezoneFromAddress, formatTimezoneDisplay } from "@shared/timezoneUtils";
import { QuickReminderContactInfo } from "./quick-reminder/contact-info";
import { QuickReminderOptionsGrid } from "./quick-reminder/options-grid";
import { type QuickReminderProps } from "./quick-reminder/types";
import {
  buildSaveDateTime,
  formatReminderTime,
  getConflictCheckResult,
  getConvertedDate,
  getTimeConversionPreview,
} from "./quick-reminder/utils";

export function QuickReminder({
  onSave,
  isSaving,
  defaultNote = "",
  defaultDate,
  storeAddress,
  storeCity,
  storeState,
  userTimezone,
  defaultTimezoneMode = "agent",
  timeFormat = "12hr",
  pointOfContact,
  pocEmail,
  pocPhone,
  defaultEmail,
  defaultPhone,
  defaultCalendarReminders = [{ method: "popup", minutes: 10 }],
}: QuickReminderProps) {
  const [note, setNote] = useState(defaultNote);
  const [date, setDate] = useState<Date | undefined>(defaultDate);
  const [time, setTime] = useState("09:00");
  const [useCustomerTimezone, setUseCustomerTimezone] = useState(defaultTimezoneMode === "customer");
  const [calendarReminders, setCalendarReminders] = useState(defaultCalendarReminders);
  const [lastSavedSlot, setLastSavedSlot] = useState<{ date: string; time: string } | null>(null);

  const customerTimezone = detectTimezoneFromAddress(storeAddress, storeCity, storeState);
  const agentTimezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const convertedDateStr = getConvertedDate(date, time, useCustomerTimezone, customerTimezone, agentTimezone);
  const selectedDateStr = date ? format(date, "yyyy-MM-dd") : null;

  const { data: dateReminders, isLoading: isLoadingReminders, error: remindersError, refetch: refetchReminders } = useQuery({
    queryKey: ["/api/reminders/by-date", selectedDateStr],
    queryFn: async () => {
      if (!selectedDateStr) return { reminders: [] };
      const response = await fetch(`/api/reminders/by-date/${selectedDateStr}`);
      if (!response.ok) throw new Error("Failed to fetch reminders");
      return response.json();
    },
    enabled: !!selectedDateStr,
  });

  const { data: convertedDateReminders, isLoading: isLoadingConvertedReminders } = useQuery({
    queryKey: ["/api/reminders/by-date", convertedDateStr],
    queryFn: async () => {
      if (!convertedDateStr) return { reminders: [] };
      const response = await fetch(`/api/reminders/by-date/${convertedDateStr}`);
      if (!response.ok) throw new Error("Failed to fetch reminders");
      return response.json();
    },
    enabled: !!convertedDateStr && convertedDateStr !== selectedDateStr,
  });

  useEffect(() => {
    setUseCustomerTimezone(defaultTimezoneMode === "customer");
  }, [defaultTimezoneMode]);

  useEffect(() => {
    if (defaultCalendarReminders) {
      setCalendarReminders(defaultCalendarReminders);
    }
  }, [JSON.stringify(defaultCalendarReminders)]);

  const selectedSlot = date
    ? buildSaveDateTime(date, time, useCustomerTimezone, customerTimezone, agentTimezone)
    : null;

  const hasJustSavedSlotConflict =
    !!selectedSlot &&
    !!lastSavedSlot &&
    selectedSlot.finalDateStr === lastSavedSlot.date &&
    selectedSlot.finalTime === lastSavedSlot.time;

  useEffect(() => {
    if (!lastSavedSlot || !selectedSlot) return;
    const stillOnSavedSlot =
      selectedSlot.finalDateStr === lastSavedSlot.date &&
      selectedSlot.finalTime === lastSavedSlot.time;
    if (!stillOnSavedSlot) {
      setLastSavedSlot(null);
    }
  }, [lastSavedSlot, selectedSlot?.finalDateStr, selectedSlot?.finalTime]);

  const handleSave = async () => {
    if (!note.trim() || !date) return;

    const { finalDateStr, finalTime } = buildSaveDateTime(date, time, useCustomerTimezone, customerTimezone, agentTimezone);

    try {
      const saveResult = await onSave({
        note,
        date: finalDateStr,
        time: finalTime,
        useCustomerTimezone: false,
        customerTimezone,
        agentTimezone,
        calendarReminders,
      });
      if (saveResult !== false) {
        setLastSavedSlot({ date: finalDateStr, time: finalTime });
      }
    } catch {
      // Save failed; keep conflict checks active.
    }
  };

  const timePreview = getTimeConversionPreview(date, time, useCustomerTimezone, customerTimezone, agentTimezone, timeFormat);

  const { hasConflict: timeConflict, isLoading: isCheckingConflict } = getConflictCheckResult({
    date,
    time,
    useCustomerTimezone,
    customerTimezone,
    agentTimezone,
    dateReminders,
    convertedDateReminders,
    isLoadingReminders,
    isLoadingConvertedReminders,
  });
  const effectiveTimeConflict = timeConflict && !hasJustSavedSlotConflict;

  const displayEmail = pocEmail || defaultEmail;
  const displayPhone = pocPhone || defaultPhone;

  return (
    <div className="space-y-4" data-testid="quick-reminder-form">
      <QuickReminderContactInfo
        pointOfContact={pointOfContact}
        displayEmail={displayEmail}
        displayPhone={displayPhone}
        pocEmail={pocEmail}
        pocPhone={pocPhone}
        defaultEmail={defaultEmail}
        defaultPhone={defaultPhone}
      />

      {customerTimezone && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted text-muted-foreground text-sm" data-testid="timezone-indicator">
          <MapPin className="h-4 w-4" />
          <span>Client timezone: {formatTimezoneDisplay(customerTimezone)}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="reminder-note">Note / Next Action</Label>
        <Textarea
          id="reminder-note"
          data-testid="input-reminder-note"
          placeholder="e.g., Follow up on sample shipment, Call to discuss pricing..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-[80px]"
        />
      </div>

      <QuickReminderOptionsGrid
        date={date}
        time={time}
        timeFormat={timeFormat}
        customerTimezone={customerTimezone}
        useCustomerTimezone={useCustomerTimezone}
        timePreview={timePreview}
        calendarReminders={calendarReminders}
        dateReminders={dateReminders}
        isLoadingReminders={isLoadingReminders}
        remindersError={remindersError}
        refetchReminders={refetchReminders}
        onDateChange={setDate}
        onTimeChange={setTime}
        onUseCustomerTimezoneChange={setUseCustomerTimezone}
        onCalendarRemindersChange={setCalendarReminders}
      />

      {!customerTimezone && (
        <p className="text-sm text-muted-foreground">
          Customer timezone could not be detected. Reminder will use your timezone ({formatTimezoneDisplay(agentTimezone)})
        </p>
      )}

      {effectiveTimeConflict && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20" data-testid="conflict-warning">
          <p className="text-sm text-destructive font-medium">Scheduling conflict</p>
          <p className="text-xs text-destructive/80 mt-1">
            You already have a reminder at {formatReminderTime(time, timeFormat)} on this date
          </p>
        </div>
      )}

      <Button onClick={handleSave} disabled={!note.trim() || !date || isSaving || effectiveTimeConflict || isCheckingConflict} className="w-full" data-testid="button-save-reminder">
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSaving ? "Saving..." : isCheckingConflict ? "Checking..." : "Save Reminder"}
      </Button>
    </div>
  );
}
