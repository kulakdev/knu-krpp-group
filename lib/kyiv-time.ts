import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/**
 * Presentation-boundary time helpers (AGENTS.md): the UI works in
 * Europe/Kyiv, the API and database only see ISO 8601 UTC.
 */
export const KYIV_TZ = "Europe/Kyiv";

/** "2030-07-01" + "10:00" entered in Kyiv -> UTC ISO string, or null if invalid. */
export function kyivToUtcIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }
  const utc = fromZonedTime(`${date}T${time}`, KYIV_TZ);
  return Number.isNaN(utc.getTime()) ? null : utc.toISOString();
}

/** UTC ISO string -> "01.07.2030 10:00" in Kyiv. */
export function formatKyiv(iso: string): string {
  return formatInTimeZone(iso, KYIV_TZ, "dd.MM.yyyy HH:mm");
}

/** UTC ISO string -> "10:00" in Kyiv. */
export function formatKyivTime(iso: string): string {
  return formatInTimeZone(iso, KYIV_TZ, "HH:mm");
}

/** Today's date in Kyiv as "yyyy-MM-dd", the default for the date input. */
export function kyivToday(now: Date): string {
  return formatInTimeZone(now, KYIV_TZ, "yyyy-MM-dd");
}
