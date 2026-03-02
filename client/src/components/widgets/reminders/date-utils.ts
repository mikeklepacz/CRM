import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { Reminder } from "./types";

export function getReminderDate(reminder: Reminder) {
  if (reminder.scheduledDate && reminder.scheduledTime && reminder.timezone) {
    try {
      const dateTimeStr = `${reminder.scheduledDate}T${reminder.scheduledTime}:00`;
      const utcDate = fromZonedTime(dateTimeStr, reminder.timezone);
      return utcDate;
    } catch (e) {
      console.error("Error parsing reminder date:", e);
      const dateTimeStr = `${reminder.scheduledDate}T${reminder.scheduledTime}:00`;
      return new Date(dateTimeStr);
    }
  }

  if (reminder.scheduledAtUtc) {
    return new Date(reminder.scheduledAtUtc);
  }
  if (reminder.dueDate) {
    return new Date(reminder.dueDate);
  }

  return new Date();
}

export function isOverdue(reminder: Reminder) {
  return getReminderDate(reminder) < new Date();
}

export function getDaysUntil(reminder: Reminder) {
  const dueDate = getReminderDate(reminder);
  const days = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days}d`;
}

export function formatReminderTime(reminder: Reminder, userTimezone: string) {
  if (reminder.scheduledDate && reminder.scheduledTime && reminder.timezone) {
    try {
      const dateTimeStr = `${reminder.scheduledDate}T${reminder.scheduledTime}:00`;
      return formatInTimeZone(dateTimeStr, reminder.timezone, "MMM d, yyyy h:mm a zzz");
    } catch (e) {
      return `${reminder.scheduledDate} ${reminder.scheduledTime}`;
    }
  }

  const date = getReminderDate(reminder);
  try {
    return formatInTimeZone(date, userTimezone, "MMM d, yyyy h:mm a zzz");
  } catch {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
}
