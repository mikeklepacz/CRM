import { format } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export function getConvertedDate(
  date: Date | undefined,
  time: string,
  useCustomerTimezone: boolean,
  customerTimezone: string | null,
  agentTimezone: string,
) {
  if (!date || !time || !useCustomerTimezone || !customerTimezone) return null;

  try {
    const dateStr = format(date, "yyyy-MM-dd");
    const customerDateTimeStr = `${dateStr}T${time}:00`;
    const utcDate = fromZonedTime(customerDateTimeStr, customerTimezone);
    return formatInTimeZone(utcDate, agentTimezone, "yyyy-MM-dd");
  } catch {
    return null;
  }
}

export function buildSaveDateTime(
  date: Date,
  time: string,
  useCustomerTimezone: boolean,
  customerTimezone: string | null,
  agentTimezone: string,
) {
  let finalTime = time;
  let finalDateStr: string;

  if (useCustomerTimezone && customerTimezone) {
    const dateStr = format(date, "yyyy-MM-dd");
    const customerDateTimeStr = `${dateStr}T${time}:00`;
    const utcDate = fromZonedTime(customerDateTimeStr, customerTimezone);
    finalTime = formatInTimeZone(utcDate, agentTimezone, "HH:mm");
    finalDateStr = formatInTimeZone(utcDate, agentTimezone, "yyyy-MM-dd");
  } else {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    finalDateStr = `${year}-${month}-${day}`;
    finalTime = time;
  }

  return { finalDateStr, finalTime };
}

export function getFriendlyTimezoneName(timezone: string): string {
  const parts = timezone.split("/");
  if (parts.length >= 2) {
    return parts[parts.length - 1].replace(/_/g, " ");
  }
  return timezone;
}

export function getTimeConversionPreview(
  date: Date | undefined,
  time: string,
  useCustomerTimezone: boolean,
  customerTimezone: string | null,
  agentTimezone: string,
  timeFormat: string | null,
) {
  if (!date || !useCustomerTimezone || !customerTimezone) return null;

  try {
    const dateStr = format(date, "yyyy-MM-dd");
    const customerDateTimeStr = `${dateStr}T${time}:00`;
    const utcDate = fromZonedTime(customerDateTimeStr, customerTimezone);

    const agentTime = formatInTimeZone(utcDate, agentTimezone, timeFormat === "24hr" ? "HH:mm" : "h:mm a");
    const customerTzName = getFriendlyTimezoneName(customerTimezone);
    const agentTzName = getFriendlyTimezoneName(agentTimezone);
    const customerTimeFormatted = timeFormat === "24hr" ? time : formatInTimeZone(utcDate, customerTimezone, "h:mm a");

    return `${customerTimeFormatted} ${customerTzName} = ${agentTime} ${agentTzName}`;
  } catch {
    return null;
  }
}

export function formatReminderTime(time: string, timeFormat: string | null) {
  if (!time) return "";
  if (timeFormat === "24hr") return time;
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function getConflictCheckResult({
  date,
  time,
  useCustomerTimezone,
  customerTimezone,
  agentTimezone,
  dateReminders,
  convertedDateReminders,
  isLoadingReminders,
  isLoadingConvertedReminders,
}: {
  date: Date | undefined;
  time: string;
  useCustomerTimezone: boolean;
  customerTimezone: string | null;
  agentTimezone: string;
  dateReminders: any;
  convertedDateReminders: any;
  isLoadingReminders: boolean;
  isLoadingConvertedReminders: boolean;
}) {
  if (!date || !time) return { hasConflict: false, isLoading: false };

  let finalTime = time;
  let agentDateStr = format(date, "yyyy-MM-dd");

  if (useCustomerTimezone && customerTimezone) {
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const customerDateTimeStr = `${dateStr}T${time}:00`;
      const utcDate = fromZonedTime(customerDateTimeStr, customerTimezone);
      finalTime = formatInTimeZone(utcDate, agentTimezone, "HH:mm");
      agentDateStr = formatInTimeZone(utcDate, agentTimezone, "yyyy-MM-dd");
    } catch {
      // If conversion fails, use original values.
    }
  }

  let remindersToCheck = dateReminders;
  const selectedDateStr = format(date, "yyyy-MM-dd");

  if (agentDateStr !== selectedDateStr) {
    if (isLoadingConvertedReminders) {
      return { hasConflict: false, isLoading: true };
    }
    remindersToCheck = convertedDateReminders;
  } else if (isLoadingReminders) {
    return { hasConflict: false, isLoading: true };
  }

  if (!remindersToCheck?.reminders) {
    return { hasConflict: false, isLoading: false };
  }

  const [hours, minutes] = finalTime.split(":").map(Number);
  const selectedTimeInMinutes = hours * 60 + minutes;

  const hasConflict = remindersToCheck.reminders.some((reminder: any) => {
    const [reminderHours, reminderMinutes] = reminder.scheduledTime.split(":").map(Number);
    const reminderTimeInMinutes = reminderHours * 60 + reminderMinutes;
    return reminderTimeInMinutes === selectedTimeInMinutes;
  });

  return { hasConflict, isLoading: false };
}
