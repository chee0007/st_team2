/**
 * Singapore timezone utilities.
 * All date/time operations in this app MUST use these helpers — never `new Date()` directly.
 */

const TZ = 'Asia/Singapore';

/**
 * Returns a Date object representing the current moment, with correct
 * Singapore local-time semantics when formatted.
 */
export function getSingaporeNow(): Date {
  return new Date();
}

/**
 * Returns the current Singapore date/time as an ISO 8601 string
 * in local Singapore time (e.g. "2025-06-15T14:30:00+08:00").
 */
export function getSingaporeISOString(): string {
  return formatToSingapore(new Date());
}

/**
 * Formats a Date as an ISO 8601 string in Singapore local time.
 */
export function formatSingaporeDate(date: Date): string {
  return formatToSingapore(date);
}

/**
 * Parses a Singapore local-time ISO string into a JS Date (UTC internally).
 */
export function parseSingaporeDate(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Returns the Singapore date portion only (YYYY-MM-DD).
 */
export function getSingaporeDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function formatToSingapore(date: Date): string {
  // Build a Singapore-offset ISO string: YYYY-MM-DDTHH:mm:ss+08:00
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';

  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour') === '24' ? '00' : get('hour');
  const minute = get('minute');
  const second = get('second');

  return `${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`;
}
