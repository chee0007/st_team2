import { describe, it, expect } from 'vitest';
import { calculateNextDueDate } from '../src/lib/recurrence';

describe('calculateNextDueDate', () => {
  it('daily adds one day and preserves time', () => {
    expect(calculateNextDueDate('2025-11-10T14:00', 'daily')).toBe('2025-11-11T14:00:00+08:00');
  });

  it('weekly adds 7 days', () => {
    expect(calculateNextDueDate('2025-11-10T14:00', 'weekly')).toBe('2025-11-17T14:00:00+08:00');
  });

  it('monthly normal keeps day', () => {
    expect(calculateNextDueDate('2025-06-15T09:00', 'monthly')).toBe('2025-07-15T09:00:00+08:00');
  });

  it('monthly overflow clamps to last day', () => {
    expect(calculateNextDueDate('2025-01-31T09:00', 'monthly')).toBe('2025-02-28T09:00:00+08:00');
  });

  it('monthly leap-year overflow preserves Feb 29', () => {
    expect(calculateNextDueDate('2024-01-31T09:00', 'monthly')).toBe('2024-02-29T09:00:00+08:00');
  });

  it('december to january rolls year', () => {
    expect(calculateNextDueDate('2025-12-31T09:00', 'monthly')).toBe('2026-01-31T09:00:00+08:00');
  });

  it('yearly no overflow', () => {
    expect(calculateNextDueDate('2025-06-15T09:00', 'yearly')).toBe('2026-06-15T09:00:00+08:00');
  });

  it('yearly leap-day overflow clamps to Feb 28', () => {
    expect(calculateNextDueDate('2024-02-29T09:00', 'yearly')).toBe('2025-02-28T09:00:00+08:00');
  });
});
