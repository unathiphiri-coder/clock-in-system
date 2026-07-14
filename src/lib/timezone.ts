// Centralized timezone handling for the clock-in system.
// Every agent and admin is based in South Africa, so any date/time shown
// in the UI, or used to decide what "today" means, must use SAST
// (South Africa Standard Time, UTC+2, no daylight saving) — not the
// server/browser's UTC default.

export const SAST_TIMEZONE = 'Africa/Johannesburg';

/**
 * Returns the current (or given) instant as a 'YYYY-MM-DD' string in SAST.
 *
 * Use this instead of `new Date().toISOString().split('T')[0]`, which
 * returns the UTC date and will show YESTERDAY's date for the first two
 * hours of every SAST day (00:00–02:00 SAST is still 22:00–00:00 UTC the
 * previous day).
 */
export function getSASTDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // en-CA locale formats as YYYY-MM-DD
}

/**
 * Formats a stored UTC timestamp as a human-readable SAST time, e.g. "14:32".
 */
export function formatSASTTime(isoString?: string | null): string {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleTimeString('en-ZA', {
    timeZone: SAST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Formats a stored UTC timestamp as a human-readable SAST date + time.
 */
export function formatSASTDateTime(isoString?: string | null): string {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleString('en-ZA', {
    timeZone: SAST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Converts a stored UTC timestamp into the 'YYYY-MM-DDTHH:mm' format that
 * an <input type="datetime-local"> expects, using SAST wall-clock time.
 *
 * Use this instead of `new Date(x).toISOString().slice(0, 16)`, which
 * shows UTC time (2 hours behind SAST) in the edit box.
 */
export function isoToSASTDatetimeLocal(isoString?: string | null): string {
  if (!isoString) return '';
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(isoString));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/**
 * Converts a 'YYYY-MM-DDTHH:mm' value from an <input type="datetime-local">
 * (entered by the admin as SAST wall-clock time) into a correct UTC ISO
 * string for storage. SAST is a fixed UTC+2 offset with no daylight saving,
 * so the offset can be attached directly.
 */
export function sastDatetimeLocalToISO(localValue: string): string {
  if (!localValue) return '';
  // localValue looks like "2026-07-13T14:30"
  return new Date(`${localValue}:00+02:00`).toISOString();
}
