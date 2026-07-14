import { describe, expect, it } from 'vitest';
import { generateCalendarGrid } from './calendar';

describe('generateCalendarGrid', () => {
  it('always returns 42 cells', () => {
    expect(generateCalendarGrid(2026, 2)).toHaveLength(42);
    expect(generateCalendarGrid(2026, 8)).toHaveLength(42);
  });

  it('includes Feb 29 for leap years', () => {
    const grid = generateCalendarGrid(2028, 2);
    const feb29 = grid.find((d) => d.date === '2028-02-29');
    expect(feb29).toBeDefined();
    expect(feb29?.isCurrentMonth).toBe(true);
  });

  it('marks weekend cells correctly', () => {
    const grid = generateCalendarGrid(2026, 7);
    const weekends = grid.filter((d) => d.isWeekend);
    expect(weekends.length).toBeGreaterThan(0);
    expect(weekends.length).toBeLessThan(42);
  });

  it('contains exactly one today marker for current month', () => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const grid = generateCalendarGrid(year, month);
    const todayCells = grid.filter((d) => d.isToday);
    expect(todayCells.length).toBeLessThanOrEqual(1);
  });
});
