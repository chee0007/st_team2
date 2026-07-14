import { test, expect } from '@playwright/test';
import {
  setupVirtualAuthenticator,
  teardownVirtualAuthenticator,
  register,
  createTodo,
  type VirtualAuthenticator,
} from './helpers';

function uniqueUser() {
  return `prio_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

test.describe('Priority System', () => {
  let va: VirtualAuthenticator;

  test.beforeEach(async ({ page }) => {
    va = await setupVirtualAuthenticator(page);
    await register(page, uniqueUser());
  });

  test.afterEach(async () => {
    await teardownVirtualAuthenticator(va);
  });

  test('create todos with priorities and show badge labels', async ({ page }) => {
    await createTodo(page, { title: 'High task', priority: 'high' });
    await createTodo(page, { title: 'Medium task', priority: 'medium' });
    await createTodo(page, { title: 'Low task', priority: 'low' });

    await expect(page.getByText('High task')).toBeVisible();
    await expect(page.getByText('Medium task')).toBeVisible();
    await expect(page.getByText('Low task')).toBeVisible();

    await expect(page.getByText('High').first()).toBeVisible();
    await expect(page.getByText('Medium').first()).toBeVisible();
    await expect(page.getByText('Low').first()).toBeVisible();
  });

  test('priority filter only shows selected level', async ({ page }) => {
    await createTodo(page, { title: 'Only high', priority: 'high' });
    await createTodo(page, { title: 'Only medium', priority: 'medium' });

    await page.selectOption('select[aria-label="Priority filter"]', 'high');

    await expect(page.getByText('Only high')).toBeVisible();
    await expect(page.getByText('Only medium')).toHaveCount(0);

    await page.selectOption('select[aria-label="Priority filter"]', 'all');
    await expect(page.getByText('Only high')).toBeVisible();
    await expect(page.getByText('Only medium')).toBeVisible();
  });

  test('editing priority re-sorts and respects active filter', async ({ page }) => {
    await createTodo(page, { title: 'Will become high', priority: 'low' });
    await page.selectOption('select[aria-label="Priority filter"]', 'low');

    const row = page.locator('li', { hasText: 'Will become high' });
    await row.getByRole('button', { name: 'Edit' }).click();

    await page.selectOption('select[aria-label="Edit priority"]', 'high');
    await page.getByRole('button', { name: 'Update' }).click();

    await expect(page.getByText('Will become high')).toHaveCount(0);

    await page.selectOption('select[aria-label="Priority filter"]', 'high');
    await expect(page.getByText('Will become high')).toBeVisible();
  });
});
