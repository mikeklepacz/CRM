import { parseBusinessHours } from "../timezoneHours";
import { toZonedTime } from "date-fns-tz";
import { isNoSendDay } from "../holidayCalendar";

function getDelayForCurrentProgress(stepDelays: any[], currentStep: number): number {
  if (!Array.isArray(stepDelays) || stepDelays.length === 0) return 0;
  if (currentStep <= 0) return 0;
  const delayIndex = currentStep;
  const raw = stepDelays[delayIndex];
  return raw !== undefined && raw !== null ? parseFloat(raw) || 0 : 0;
}

export async function isRecipientEligibleForRebuildSlot(
  recipient: any,
  slotUtc: Date,
  settings: any
): Promise<boolean> {
  const recipientTimezone = recipient.timezone;
  if (!recipientTimezone) return false;

  try {
    Intl.DateTimeFormat(undefined, { timeZone: recipientTimezone });
  } catch {
    return false;
  }

  const localTime = toZonedTime(slotUtc, recipientTimezone);
  const dayOfWeek = localTime.getDay();

  const noSendCheck = await isNoSendDay(slotUtc, recipientTimezone);
  if (noSendCheck.blocked) return false;

  const excludedDays = settings.excludedDays || [];
  if (excludedDays.includes(dayOfWeek)) return false;

  const parsed = parseBusinessHours(recipient.business_hours || "", recipient.state || "");
  if (parsed.isClosed) return false;

  const daySchedule = parsed.schedule[dayOfWeek];
  if (!daySchedule || daySchedule.length === 0) return false;

  const firstRange = daySchedule[0];
  const openMinutes = firstRange.open;
  const closeMinutes = firstRange.close;
  const localMinutes = localTime.getHours() * 60 + localTime.getMinutes();

  const clientWindowStartOffset = parseFloat(String(
    settings.clientWindowStartOffset ?? settings.clientStartOffsetHours ?? 1
  ));
  const windowStartMinutes = openMinutes + (clientWindowStartOffset * 60);

  const clientWindowEndHour = Number(
    settings.clientWindowEndHour ?? settings.clientCutoffHour ?? 14
  );
  const windowEndMinutes = Math.min(closeMinutes, clientWindowEndHour * 60);

  if (localMinutes < windowStartMinutes || localMinutes > windowEndMinutes) return false;

  const currentStep = recipient.current_step || 0;
  const stepDelay = getDelayForCurrentProgress(recipient.step_delays || [], currentStep);
  if (stepDelay > 0 && recipient.last_step_sent_at) {
    const lastSent = new Date(recipient.last_step_sent_at);
    const delayMs = stepDelay * 24 * 60 * 60 * 1000;
    const earliestNext = new Date(lastSent.getTime() + delayMs);
    if (slotUtc < earliestNext) return false;
  }

  return true;
}
