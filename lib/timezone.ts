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
 * Backward-compatible alias used by API routes.
 */
export function parseISODate(isoString: string): Date {
  return parseSingaporeDate(isoString);
}

/**
 * Returns true if a date is at least one minute in the future.
 */
export function isAtLeastOneMinuteInFuture(date: Date): boolean {
  const diffMs = date.getTime() - getSingaporeNow().getTime();
  return diffMs >= 60_000;
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

// ─── Recurrence helpers ──────────────────────────────────────────────────────

export type SingaporeParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function parseIsoLike(dateStr: string): SingaporeParts {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(.*)$/);
  if (!m) throw new Error('Invalid date format');
  const [, y, mo, d, hh, mm, ss] = m;
  return {
    year: Number(y),
    month: Number(mo),
    day: Number(d),
    hour: Number(hh),
    minute: Number(mm),
    second: ss ? Number(ss) : 0,
  };
}

export function toSingaporeParts(dateStr: string): SingaporeParts {
  const parsed = parseIsoLike(dateStr);
  const utcMillis = Date.UTC(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute, parsed.second);
  const sgt = new Date(utcMillis + 8 * 60 * 60 * 1000);
  return {
    year: sgt.getUTCFullYear(),
    month: sgt.getUTCMonth() + 1,
    day: sgt.getUTCDate(),
    hour: sgt.getUTCHours(),
    minute: sgt.getUTCMinutes(),
    second: sgt.getUTCSeconds(),
  };
}

export function fromSingaporeParts(parts: { year: number; month: number; day: number }, hour = 0, minute = 0): string {
  const y = String(parts.year).padStart(4, '0');
  const m = String(parts.month).padStart(2, '0');
  const d = String(parts.day).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}:00+08:00`;
}

export function addDays(parts: { year: number; month: number; day: number }, days: number) {
  const dt = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  dt.setUTCDate(dt.getUTCDate() + days);
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}
