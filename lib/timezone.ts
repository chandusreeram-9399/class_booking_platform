import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Convert UTC time to user's local timezone
 * @param utcDate Date in UTC
 * @param timezone User's timezone (e.g., 'America/New_York')
 * @returns Date object representing the time in user's timezone
 */
export function convertUTCToUserTimezone(utcDate: Date, timezone: string): Date {
  try {
    return toZonedTime(utcDate, timezone);
  } catch (error) {
    console.error(`Invalid timezone: ${timezone}`, error);
    return utcDate; // Fallback to UTC
  }
}

/**
 * Convert user's local time to UTC
 * @param localDate Date in user's timezone
 * @param timezone User's timezone
 * @returns Date in UTC
 */
export function convertUserTimezoneToUTC(localDate: Date, timezone: string): Date {
  try {
    return fromZonedTime(localDate, timezone);
  } catch (error) {
    console.error(`Invalid timezone: ${timezone}`, error);
    return localDate; // Fallback
  }
}

/**
 * Format a date in a specific timezone
 * @param date Date to format
 * @param timezone Timezone for display
 * @param format Format string (date-fns format)
 * @returns Formatted date string
 */
export function formatDateInTimezone(
  date: Date,
  timezone: string,
  format: string = 'yyyy-MM-dd HH:mm:ss zzz'
): string {
  try {
    return formatInTimeZone(date, timezone, format);
  } catch (error) {
    console.error(`Invalid timezone: ${timezone}`, error);
    return date.toISOString();
  }
}

/**
 * Get current time in a specific timezone
 * @param timezone Timezone
 * @returns Current time in that timezone
 */
export function getCurrentTimeInTimezone(timezone: string): Date {
  try {
    return toZonedTime(new Date(), timezone);
  } catch (error) {
    console.error(`Invalid timezone: ${timezone}`, error);
    return new Date();
  }
}

/**
 * Check if two time ranges overlap
 * @param start1 Start of first range
 * @param end1 End of first range
 * @param start2 Start of second range
 * @param end2 End of second range
 * @returns True if ranges overlap
 */
export function doTimeRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * List of valid timezones (IANA timezone identifiers)
 */
export const VALID_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Denver',
  'America/Anchorage',
  'America/Toronto',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Vienna',
  'Europe/Prague',
  'Europe/Warsaw',
  'Europe/Moscow',
  'Europe/Istanbul',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Singapore',
  'Australia/Sydney',
  'Australia/Brisbane',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Pacific/Fiji',
  'Africa/Johannesburg',
  'Africa/Cairo',
];

/**
 * Validate if a timezone string is valid
 */
export function isValidTimezone(timezone: string): boolean {
  return VALID_TIMEZONES.includes(timezone);
}
