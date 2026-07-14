export type SingaporeParts = {
  year: number;
  month: number; // 1-12
  day: number;
};

export function parseIsoLike(dateStr: string) {
  // Accepts forms like '2025-11-10T14:00', '2025-11-10T14:00:00', or with timezone offsets
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

export function toSingaporeParts(dateStr: string) {
  // We treat the input as an ISO-like string. Convert it to an absolute instant, then shift to SGT (+08:00)
  const parsed = parseIsoLike(dateStr);

  // Create a Date assuming the supplied string is in local SGT if no explicit offset provided.
  // To be safe, construct a Date in UTC from the parsed components then shift by +8h to represent SGT.
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

export function fromSingaporeParts(parts: { year: number; month: number; day: number }, hour = 0, minute = 0) {
  // Build an ISO string that includes +08:00 offset so consumers know this is Singapore-local time
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
