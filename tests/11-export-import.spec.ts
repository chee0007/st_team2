import { test, expect } from '@playwright/test';
import {
  setupVirtualAuthenticator,
  teardownVirtualAuthenticator,
  register,
  type VirtualAuthenticator,
} from './helpers';

function uniqueUser() {
  return `expimp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

test.describe('Export and Import', () => {
  let va: VirtualAuthenticator;

  test.beforeEach(async ({ page }) => {
    va = await setupVirtualAuthenticator(page);
    await register(page, uniqueUser());
  });

  test.afterEach(async () => {
    await teardownVirtualAuthenticator(va);
  });

  test('export JSON endpoint returns envelope with version 1', async ({ page }) => {
    const data = await page.evaluate(async () => {
      const res = await fetch('/api/todos/export?format=json');
      return {
        status: res.status,
        contentType: res.headers.get('content-type') ?? '',
        disposition: res.headers.get('content-disposition') ?? '',
        body: await res.json(),
      };
    });

    expect(data.status).toBe(200);
    expect(data.contentType).toContain('application/json');
    expect(data.disposition).toContain('todos-');
    expect(data.body.version).toBe(1);
    expect(Array.isArray(data.body.todos)).toBe(true);
  });

  test('import invalid JSON returns format error', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/todos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{bad json',
      });
      return { status: res.status, body: await res.json() };
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid JSON format');
  });

  test('import valid payload creates todos and returns counts', async ({ page }) => {
    const payload = {
      version: 1,
      exported_at: new Date().toISOString(),
      todos: [
        {
          title: 'Imported todo',
          completed: false,
          due_date: null,
          priority: 'medium',
          is_recurring: false,
          recurrence_pattern: null,
          reminder_minutes: null,
          created_at: new Date().toISOString(),
          subtasks: [{ title: 'Imported subtask', completed: false, position: 0 }],
          tags: [{ name: 'ImportedTag', color: '#3B82F6' }],
        },
      ],
    };

    const response = await page.evaluate(async (body) => {
      const res = await fetch('/api/todos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return { status: res.status, body: await res.json() };
    }, payload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.imported).toBe(1);

    const todos = await page.evaluate(async () => {
      const res = await fetch('/api/todos');
      const body = await res.json();
      return body.data;
    });

    expect(todos.some((t: { title: string }) => t.title === 'Imported todo')).toBe(true);
  });
});
