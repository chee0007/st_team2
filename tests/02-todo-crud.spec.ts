import { test, expect } from '@playwright/test';
import {
  setupVirtualAuthenticator,
  teardownVirtualAuthenticator,
  register,
  createTodo,
  type VirtualAuthenticator,
} from './helpers';

function uniqueUser() {
  return `todo_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

test.describe('Todo CRUD', () => {
  let va: VirtualAuthenticator;

  test.beforeEach(async ({ page }) => {
    va = await setupVirtualAuthenticator(page);
    await register(page, uniqueUser());
  });

  test.afterEach(async () => {
    await teardownVirtualAuthenticator(va);
  });

  test('create todo with title only appears in Pending section', async ({ page }) => {
    await createTodo(page, { title: 'Buy milk' });

    await expect(page.getByRole('heading', { name: 'Pending (1)' })).toBeVisible();
    await expect(page.getByText('Buy milk')).toBeVisible();
  });

  test('toggle completion moves todo to Completed section', async ({ page }) => {
    await createTodo(page, { title: 'Finish report' });

    await page.getByLabel('Toggle Finish report').check();

    await expect(page.getByRole('heading', { name: 'Completed (1)' })).toBeVisible();
    await expect(page.getByText('Finish report')).toBeVisible();
  });

  test('delete todo removes it from list', async ({ page }) => {
    await createTodo(page, { title: 'Delete me' });

    const row = page.locator('li', { hasText: 'Delete me' });
    await row.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('Delete me')).toHaveCount(0);
  });
});
