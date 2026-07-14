const TZ = 'Asia/Singapore';

/**
 * Returns a Date representing the current moment.
 * JS Date is always UTC internally; use formatSingaporeDate() to extract
 * Singapore-local date/time components — never new Date() for comparisons.
 */
export function getSingaporeNow(): Date {
  return new Date();
}

/**
 * Formats a Date in Singapore timezone using a simple template.
 * Supported tokens: YYYY MM DD HH mm ss
 */
export function formatSingaporeDate(date: Date, format: string): string {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    f.formatToParts(date).map(({ type, value }) => [type, value])
  );
  // Intl can return '24' for midnight; normalise to '00'
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return format
    .replace('YYYY', parts.year)
    .replace('MM', parts.month)
    .replace('DD', parts.day)
    .replace('HH', hour)
    .replace('mm', parts.minute)
    .replace('ss', parts.second);
}

/** Returns today's date string in Singapore timezone as YYYY-MM-DD. */
export function getSingaporeDateString(): string {
  return formatSingaporeDate(getSingaporeNow(), 'YYYY-MM-DD');
}
