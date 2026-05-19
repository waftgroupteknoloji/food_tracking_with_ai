import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';

export const DEFAULT_TIMEZONE = 'Europe/Istanbul';

/**
 * Bir Date objesinden, kullanıcı timezone'una göre "YYYY-MM-DD" string'i döner.
 * Bu fonksiyon tüm "günlük" sorguların temelidir.
 */
export function toLocalDate(date: Date | string, timezone: string = DEFAULT_TIMEZONE): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(d, timezone, 'yyyy-MM-dd');
}

/**
 * "YYYY-MM-DD" localDate string'inden, o günün başlangıç UTC instant'ını döner.
 */
export function localDateStart(localDate: string, timezone: string = DEFAULT_TIMEZONE): Date {
  return fromZonedTime(`${localDate}T00:00:00`, timezone);
}

/**
 * "YYYY-MM-DD" localDate string'inden, ertesi günün başlangıç UTC instant'ını döner.
 */
export function localDateEnd(localDate: string, timezone: string = DEFAULT_TIMEZONE): Date {
  const start = localDateStart(localDate, timezone);
  return addDays(start, 1);
}

/**
 * Bugünün localDate'ini döner.
 */
export function todayLocalDate(timezone: string = DEFAULT_TIMEZONE): string {
  return toLocalDate(new Date(), timezone);
}

/**
 * İki localDate arasında kaç gün fark olduğunu döner.
 */
export function daysBetween(a: string, b: string): number {
  return differenceInCalendarDays(parseISO(a), parseISO(b));
}

/**
 * Bir localDate'e gün ekler/çıkarır.
 */
export function addDaysToLocal(localDate: string, days: number): string {
  const d = parseISO(localDate);
  return formatInTimeZone(addDays(d, days), 'UTC', 'yyyy-MM-dd');
}
