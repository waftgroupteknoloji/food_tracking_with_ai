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
 * Bir localDate'e gün ekler/çıkarır. YYYY-MM-DD → YYYY-MM-DD, TZ bağımsız.
 * Eski sürüm parseISO + formatInTimeZone('UTC') kullanıyordu — UTC+3 gibi
 * pozitif offset'lerde her çağrı bir gün geri kayıyordu.
 */
export function addDaysToLocal(localDate: string, days: number): string {
  const [y, m, d] = localDate.split('-').map(Number);
  if (!y || !m || !d) return localDate;
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
