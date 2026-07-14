import { test, expect } from '@playwright/test';
import { setupVirtualAuthenticator, register, createTodo } from './helpers';

// Unique prefix per run to avoid cross-test user collisions
const UID = `cal_${Date.now()}`;

function sgToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
}

function sgDaysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
}

function currentSgMonth(): { year: number; month: number } {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

test.describe('Calendar View — PRP 10', () => {
  test.beforeEach(async ({ page }) => {
    await setupVirtualAuthenticator(page);
    const uniqueUsername = `${UID}_${test.info().workerIndex}_${Date.now()}_${Math.floor(Math.random() * 10_000)}`;
    await register(page, uniqueUsername);
  });

  // ── 1. Route protection ────────────────────────────────────────────────────

  test('unauthenticated access to /calendar redirects to /login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/calendar');
    await expect(page).toHaveURL('/login');
  });

  // ── 2. Default month ───────────────────────────────────────────────────────

  test('navigating to /calendar renders the current Singapore month', async ({ page }) => {
    await page.goto('/calendar');
    const { year, month } = currentSgMonth();
    const expected = new Date(year, month - 1, 1).toLocaleString('en-US', {
      month: 'long',
      timeZone: 'Asia/Singapore',
    });
    await expect(page.locator('[data-testid="calendar-month-label"]')).toContainText(expected);
  });

  // ── 3. Grid structure ─────────────────────────────────────────────────────

  test('calendar grid always contains exactly 42 cells', async ({ page }) => {
    await page.goto('/calendar');
    const cells = page.locator('[data-testid="calendar-cell"]');
    await expect(cells).toHaveCount(42);
  });

  // ── 4. Todo appears on correct cell ───────────────────────────────────────

  test('todo with due_date appears on the correct calendar cell', async ({ page }) => {
    const dueDate = sgDaysFromNow(3);
    await createTodo(page, 'Calendar Pill Todo', { dueDate });
    await page.goto('/calendar');
    const cell = page.locator(`[data-date="${dueDate}"]`);
    await expect(cell).toContainText('Calendar Pill Todo');
  });

  // ── 5. Todo without due_date is not rendered ──────────────────────────────

  test('todo without due_date does not appear on any calendar cell', async ({ page }) => {
    await createTodo(page, 'Undated Todo');
    await page.goto('/calendar');
    await expect(page.locator('text=Undated Todo')).not.toBeVisible();
  });

  // ── 6. Prev month navigation ──────────────────────────────────────────────

  test('◀ button moves to previous month and updates URL', async ({ page }) => {
    await page.goto('/calendar');
    await page.click('[data-testid="prev-month-btn"]');

    const { year, month } = currentSgMonth();
    const py = month === 1 ? year - 1 : year;
    const pm = month === 1 ? 12 : month - 1;
    const expected = `${py}-${String(pm).padStart(2, '0')}`;
    await expect(page).toHaveURL(new RegExp(`month=${expected}`));
  });

  // ── 7. Next month navigation ──────────────────────────────────────────────

  test('▶ button moves to next month and updates URL', async ({ page }) => {
    await page.goto('/calendar');
    await page.click('[data-testid="next-month-btn"]');

    const { year, month } = currentSgMonth();
    const ny = month === 12 ? year + 1 : year;
    const nm = month === 12 ? 1 : month + 1;
    const expected = `${ny}-${String(nm).padStart(2, '0')}`;
    await expect(page).toHaveURL(new RegExp(`month=${expected}`));
  });

  // ── 8. Today button ───────────────────────────────────────────────────────

  test('Today button returns to current month from a distant month', async ({ page }) => {
    await page.goto('/calendar?month=2025-01');
    await page.click('[data-testid="today-btn"]');

    const { year, month } = currentSgMonth();
    const expected = `${year}-${String(month).padStart(2, '0')}`;
    await expect(page).toHaveURL(new RegExp(`month=${expected}`));
  });

  // ── 9. Day modal ──────────────────────────────────────────────────────────

  test('clicking a day with todos opens DayTodosModal listing them', async ({ page }) => {
    const dueDate = sgDaysFromNow(5);
    await createTodo(page, 'Modal Test Todo', { dueDate });
    await page.goto('/calendar');

    await page.click(`[data-date="${dueDate}"]`);
    const modal = page.locator('[data-testid="day-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Modal Test Todo');
  });

  test('closing DayTodosModal hides it', async ({ page }) => {
    const dueDate = sgDaysFromNow(6);
    await createTodo(page, 'Close Modal Todo', { dueDate });
    await page.goto('/calendar');

    await page.click(`[data-date="${dueDate}"]`);
    await expect(page.locator('[data-testid="day-modal"]')).toBeVisible();

    // Close by clicking the ✕ button
    await page.click('[data-testid="day-modal"] button[aria-label="Close"]');
    await expect(page.locator('[data-testid="day-modal"]')).not.toBeVisible();
  });

  // ── 10. Invalid ?month= param ─────────────────────────────────────────────

  test('?month=2026-13 (invalid) falls back to current month without crashing', async ({ page }) => {
    await page.goto('/calendar?month=2026-13');
    const { year, month } = currentSgMonth();
    const expected = new Date(year, month - 1, 1).toLocaleString('en-US', {
      month: 'long',
      timeZone: 'Asia/Singapore',
    });
    await expect(page.locator('[data-testid="calendar-month-label"]')).toContainText(expected);
    // Should not crash (no unhandled error overlay)
    await expect(page.locator('[data-testid="calendar-cell"]')).toHaveCount(42);
  });

  test('?month=abc (malformed) falls back to current month', async ({ page }) => {
    await page.goto('/calendar?month=abc');
    const cells = page.locator('[data-testid="calendar-cell"]');
    await expect(cells).toHaveCount(42);
  });

  // ── 11. Priority colour-coding ────────────────────────────────────────────

  test('high-priority todo pill has red styling on calendar cell', async ({ page }) => {
    const dueDate = sgDaysFromNow(4);
    await createTodo(page, 'High Priority Task', { dueDate, priority: 'high' });
    await page.goto('/calendar');

    const pill = page.locator(`[data-date="${dueDate}"] .bg-red-100, [data-date="${dueDate}"] [class*="bg-red"]`).first();
    await expect(pill).toBeVisible();
  });

  // ── 12. Overflow badge ─────────────────────────────────────────────────────

  test('cell with more than 3 todos shows overflow badge', async ({ page }) => {
    const dueDate = sgDaysFromNow(7);
    for (let i = 1; i <= 5; i++) {
      await createTodo(page, `Overflow Todo ${i}`, { dueDate });
    }
    await page.goto('/calendar');

    const cell = page.locator(`[data-date="${dueDate}"]`);
    await expect(cell).toContainText('+2 more');
  });

  // ── 13. ?month= URL state preserved ──────────────────────────────────────

  test('loading /calendar?month=2026-07 renders July 2026', async ({ page }) => {
    await page.goto('/calendar?month=2026-07');
    await expect(page.locator('[data-testid="calendar-month-label"]')).toContainText('July 2026');
  });
});
