const TIMEZONE = 'Asia/Singapore';

export function getSingaporeNow(): Date {
  const now = new Date();
  // Return a Date whose local methods reflect Singapore time
  const sgStr = now.toLocaleString('en-CA', { timeZone: TIMEZONE, hour12: false });
  return new Date(sgStr);
}

export function formatSingaporeDate(date: Date | string, fmt: 'date' | 'datetime' | 'iso' = 'iso'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (fmt === 'date') {
    return d.toLocaleDateString('en-CA', { timeZone: TIMEZONE }); // YYYY-MM-DD
  }
  if (fmt === 'datetime') {
    return d.toLocaleString('sv-SE', { timeZone: TIMEZONE }); // YYYY-MM-DD HH:mm:ss
  }
  // iso: same as datetime (ISO 8601 local)
  return d.toLocaleString('sv-SE', { timeZone: TIMEZONE });
}

export function toSingaporeISOString(date: Date): string {
  return date.toLocaleString('sv-SE', { timeZone: TIMEZONE });
}
