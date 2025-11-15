import { computeNextSendSlot } from './smartTiming';
import { formatInTimeZone } from 'date-fns-tz';

const baselineTime = new Date('2025-11-17T12:00:00Z');

const result = computeNextSendSlot({
  baselineTime,
  adminTimezone: 'Europe/Warsaw',
  adminStartHour: 6,
  adminEndHour: 23,
  recipientBusinessHours: 'Mon-Fri 9am-5pm',
  recipientTimezone: 'America/Los_Angeles',
  clientWindowStartOffset: 1,
  clientWindowEndHour: 14,
  skipWeekends: false,
  minimumTime: baselineTime,
});

console.log('UTC →', result.toISOString());
console.log(
  'Local (PST) →',
  formatInTimeZone(result, 'America/Los_Angeles', 'yyyy-MM-dd HH:mm zzz')
);