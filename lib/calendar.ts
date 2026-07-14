import { getSingaporeNow, formatSingaporeDate } from './timezone';
import type { CalendarDay } from './db';

/**
 * Generates a fixed 6×7 (42-cell) calendar grid for the given year/month.
 * month is 1-indexed (1 = January).
 * Leading and trailing days from adjacent months fill the remaining cells.
 * Always 42 cells so grid height never changes between months.
 */
export function generateCalendarGrid(year: number, month: number): CalendarDay[] {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const startWeekday = firstOfMonth.getUTCDay(); // 0 = Sunday
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const today = formatSingaporeDate(getSingaporeNow(), 'YYYY-MM-DD');
  const cells: CalendarDay[] = [];
  const TOTAL = 42; // 6 rows × 7 cols — fixed regardless of month length

  for (let i = 0; i < TOTAL; i++) {
    const dayOffset = i - startWeekday + 1;
    const cellDate = new Date(Date.UTC(year, month - 1, dayOffset));
    const dateStr = formatSingaporeDate(cellDate, 'YYYY-MM-DD');
    const weekday = cellDate.getUTCDay();

    cells.push({
      date: dateStr,
      isCurrentMonth: dayOffset >= 1 && dayOffset <= daysInMonth,
      isToday: dateStr === today,
      isPast: dateStr < today,
      isWeekend: weekday === 0 || weekday === 6,
    });
  }

  return cells;
}

/** Returns { year, month } for the month before the given one. */
export function prevMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/** Returns { year, month } for the month after the given one. */
export function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}
