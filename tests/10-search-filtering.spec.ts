import { test, expect } from '@playwright/test';
import {
  setupVirtualAuthenticator,
  teardownVirtualAuthenticator,
  register,
  createTodo,
  type VirtualAuthenticator,
} from './helpers';

function uniqueUser() {
  return `sf_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

type EvalPage = Parameters<typeof register>[0];

async function apiCreateTodo(page: EvalPage, data: Record<string, unknown>) {
  return page.evaluate(async (body) => {
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: res.status, data: await res.json() };
  }, data);
}

async function apiAddSubtask(page: EvalPage, todoId: number, title: string) {
  return page.evaluate(
    async ({ id, title: t }) => {
      const res = await fetch(`/api/todos/${id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t }),
      });
      return res.json();
    },
    { id: todoId, title },
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Search & Filtering', () => {
  let va: VirtualAuthenticator;

  test.beforeEach(async ({ page }) => {
    va = await setupVirtualAuthenticator(page);
    await register(page, uniqueUser());
    await page.goto('/');
  });

  test.afterEach(async () => {
    await teardownVirtualAuthenticator(va);
  });

  // ─── Search ────────────────────────────────────────────────────────────────

  test('search by todo title returns only matching todos', async ({ page }) => {
    await createTodo(page, { title: 'Buy groceries' });
    await createTodo(page, { title: 'Team standup meeting' });

    await page.fill('[aria-label="Search todos"]', 'grocery');
    await page.waitForTimeout(400); // wait for debounce

    await expect(page.getByText('Buy groceries')).toBeVisible();
    await expect(page.getByText('Team standup meeting')).not.toBeVisible();
  });

  test('search by subtask title returns the parent todo', async ({ page }) => {
    const { data } = await apiCreateTodo(page, { title: 'Project Alpha', priority: 'medium' });
    await apiAddSubtask(page, data.data.id, 'Write unit tests');

    await page.reload();
    await page.fill('[aria-label="Search todos"]', 'unit tests');
    await page.waitForTimeout(400);

    await expect(page.getByText('Project Alpha')).toBeVisible();
  });

  test('search is case-insensitive', async ({ page }) => {
    await createTodo(page, { title: 'Team meeting' });

    await page.fill('[aria-label="Search todos"]', 'MEETING');
    await page.waitForTimeout(400);

    await expect(page.getByText('Team meeting')).toBeVisible();
  });

  test('clear search via × button immediately restores full list', async ({ page }) => {
    await createTodo(page, { title: 'Buy groceries' });
    await createTodo(page, { title: 'Write report' });

    await page.fill('[aria-label="Search todos"]', 'grocery');
    await page.waitForTimeout(400);
    await expect(page.getByText('Write report')).not.toBeVisible();

    // Click the ✕ clear button
    await page.click('[aria-label="Clear search"]');
    await expect(page.getByText('Write report')).toBeVisible();
  });

  // ─── Priority filter ───────────────────────────────────────────────────────

  test('priority filter shows only matching todos', async ({ page }) => {
    await createTodo(page, { title: 'High task', priority: 'high' });
    await createTodo(page, { title: 'Low task', priority: 'low' });

    await page.selectOption('[aria-label="Filter by priority"]', 'high');

    await expect(page.getByText('High task')).toBeVisible();
    await expect(page.getByText('Low task')).not.toBeVisible();
  });

  // ─── Advanced panel ────────────────────────────────────────────────────────

  test('clicking Advanced reveals completion and date controls', async ({ page }) => {
    await page.click('button:has-text("Advanced")');

    await expect(page.getByLabel('Completion').or(page.locator('select').filter({ hasText: 'All Todos' }))).toBeVisible();
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
  });

  test('completion filter isolates incomplete vs completed todos', async ({ page }) => {
    await createTodo(page, { title: 'Pending task' });

    // Toggle first todo to complete via checkbox
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.check();

    await page.click('button:has-text("Advanced")');
    await page.selectOption('select:near(label:has-text("Completion"))', 'incomplete');

    await expect(page.getByText('Pending task')).not.toBeVisible();

    await page.selectOption('select:near(label:has-text("Completion"))', 'completed');
    await expect(page.getByText('Pending task')).toBeVisible();
  });

  // ─── Clear All ────────────────────────────────────────────────────────────

  test('Clear All is only visible when a filter is active', async ({ page }) => {
    await expect(page.getByText('Clear All')).not.toBeVisible();

    await page.fill('[aria-label="Search todos"]', 'something');
    await page.waitForTimeout(400);

    await expect(page.getByText('Clear All')).toBeVisible();
  });

  test('Clear All resets all filters and restores full list', async ({ page }) => {
    await createTodo(page, { title: 'Alpha' });
    await createTodo(page, { title: 'Beta' });

    await page.fill('[aria-label="Search todos"]', 'Alpha');
    await page.waitForTimeout(400);
    await expect(page.getByText('Beta')).not.toBeVisible();

    await page.click('button:has-text("Clear All")');

    await expect(page.getByText('Alpha')).toBeVisible();
    await expect(page.getByText('Beta')).toBeVisible();
    await expect(page.getByText('Clear All')).not.toBeVisible();
  });

  // ─── Save filter preset ────────────────────────────────────────────────────

  test('save a filter preset, reload, apply it to reproduce the filtered view', async ({ page }) => {
    await createTodo(page, { title: 'Important work task', priority: 'high' });
    await createTodo(page, { title: 'Low priority chore', priority: 'low' });

    // Set a filter
    await page.selectOption('[aria-label="Filter by priority"]', 'high');

    // Open Advanced to see preset pills
    await page.click('button:has-text("Advanced")');

    // Save the filter
    await page.click('button:has-text("Save Filter")');
    await expect(page.getByText('Save Filter Preset')).toBeVisible();

    await page.fill('input[placeholder*="Today"]', 'High Only');
    await page.click('button:has-text("Save"):not(:has-text("Save Filter"))');

    // Verify preset pill appears
    await expect(page.getByText('High Only')).toBeVisible();

    // Reload and re-open Advanced
    await page.reload();
    await page.click('button:has-text("Advanced")');

    // Preset survives reload
    await expect(page.getByText('High Only')).toBeVisible();

    // Clear filters first, then apply preset
    await page.click('button:has-text("Clear All")').catch(() => {}); // may not be visible if no active filter
    await page.click('button:has-text("High Only")');

    // The priority filter should be restored to 'high'
    const prioritySelect = page.locator('[aria-label="Filter by priority"]');
    await expect(prioritySelect).toHaveValue('high');
  });

  test('deleting a saved preset removes it from the UI', async ({ page }) => {
    await page.fill('[aria-label="Search todos"]', 'test');
    await page.waitForTimeout(400);
    await page.click('button:has-text("Advanced")');
    await page.click('button:has-text("Save Filter")');
    await page.fill('input[placeholder*="Today"]', 'My Preset');
    await page.click('button:has-text("Save"):not(:has-text("Save Filter"))');

    await expect(page.getByText('My Preset')).toBeVisible();

    // Click the ✕ on the preset pill
    await page.click(`[aria-label="Delete preset My Preset"]`);

    await expect(page.getByText('My Preset')).not.toBeVisible();

    // Reload — preset is gone from localStorage
    await page.reload();
    await page.click('button:has-text("Advanced")');
    await expect(page.getByText('My Preset')).not.toBeVisible();
  });

  // ─── Empty state ───────────────────────────────────────────────────────────

  test('shows distinct empty states: no todos vs no filter matches', async ({ page }) => {
    // No todos at all
    await expect(page.getByText('You have no todos yet.')).toBeVisible();

    // Add one, then filter to get zero matches
    await createTodo(page, { title: 'My only task', priority: 'low' });
    await page.selectOption('[aria-label="Filter by priority"]', 'high');
    await expect(page.getByText('No todos match your filters.')).toBeVisible();
    await expect(page.getByText('You have no todos yet.')).not.toBeVisible();
  });
});
