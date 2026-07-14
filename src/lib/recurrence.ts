import { toSingaporeParts, fromSingaporeParts, addDays } from './timezone';

export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

export function calculateNextDueDate(currentDueDate: string, pattern: RecurrencePattern): string {
  const parts = toSingaporeParts(currentDueDate);
  const { year, month, day, hour, minute } = parts;

  switch (pattern) {
    case 'daily': {
      const next = addDays({ year, month, day }, 1);
      return fromSingaporeParts(next, hour, minute);
    }
    case 'weekly': {
      const next = addDays({ year, month, day }, 7);
      return fromSingaporeParts(next, hour, minute);
    }
    case 'monthly': {
      const targetMonth = month === 12 ? 1 : month + 1;
      const targetYear = month === 12 ? year + 1 : year;
      const clampedDay = Math.min(day, daysInMonth(targetYear, targetMonth));
      return fromSingaporeParts({ year: targetYear, month: targetMonth, day: clampedDay }, hour, minute);
    }
    case 'yearly': {
      const targetYear = year + 1;
      const clampedDay = Math.min(day, daysInMonth(targetYear, month));
      return fromSingaporeParts({ year: targetYear, month, day: clampedDay }, hour, minute);
    }
    default:
      throw new Error('Invalid recurrence pattern');
  }
}

export { daysInMonth };
