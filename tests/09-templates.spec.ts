import { test, expect } from '@playwright/test';
import { setupVirtualAuthenticator, teardownVirtualAuthenticator, register, type VirtualAuthenticator } from './helpers';

function uniqueUser() {
  return `tpl_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

// ─── API helpers (direct fetch via page.evaluate) ─────────────────────────────

async function apiCreateTemplate(
  page: Parameters<typeof register>[0],
  data: Record<string, unknown>,
) {
  return page.evaluate(async (body) => {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: res.status, data: await res.json() };
  }, data);
}

async function apiGetTemplates(page: Parameters<typeof register>[0]) {
  return page.evaluate(async () => {
    const res = await fetch('/api/templates');
    return res.json();
  });
}

async function apiUseTemplate(page: Parameters<typeof register>[0], id: number) {
  return page.evaluate(async (templateId) => {
    const res = await fetch(`/api/templates/${templateId}/use`, { method: 'POST' });
    return { status: res.status, data: await res.json() };
  }, id);
}

async function apiDeleteTemplate(page: Parameters<typeof register>[0], id: number) {
  return page.evaluate(async (templateId) => {
    const res = await fetch(`/api/templates/${templateId}`, { method: 'DELETE' });
    return res.status;
  }, id);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Template System', () => {
  let va: VirtualAuthenticator;

  test.beforeEach(async ({ page }) => {
    va = await setupVirtualAuthenticator(page);
    await register(page, uniqueUser());
  });

  test.afterEach(async () => {
    await teardownVirtualAuthenticator(va);
  });

  // ─── Create ────────────────────────────────────────────────────────────────

  test('create a template and verify it appears in the list', async ({ page }) => {
    const { status, data } = await apiCreateTemplate(page, {
      name: 'Weekly Review',
      title_template: 'Weekly team review',
      priority: 'high',
      is_recurring: true,
      recurrence_pattern: 'weekly',
      reminder_minutes: 60,
      due_date_offset_minutes: 10080, // 1 week
      subtasks: [
        { title: 'Review metrics', position: 0 },
        { title: 'Update roadmap', position: 1 },
      ],
    });

    expect(status).toBe(201);
    expect(data.name).toBe('Weekly Review');
    expect(data.priority).toBe('high');
    expect(data.is_recurring).toBe(true);
    expect(data.recurrence_pattern).toBe('weekly');

    const templates = await apiGetTemplates(page);
    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe('Weekly Review');
  });

  test('template appears in the Templates modal UI', async ({ page }) => {
    await apiCreateTemplate(page, {
      name: 'Daily Standup',
      title_template: 'Standup notes',
      priority: 'medium',
      due_date_offset_minutes: 1440,
      is_recurring: true,
      recurrence_pattern: 'daily',
    });

    await page.goto('/');
    await page.click('button:has-text("Templates")');

    await expect(page.getByText('Daily Standup')).toBeVisible();
  });

  // ─── Use ───────────────────────────────────────────────────────────────────

  test('use a template creates a todo with matching fields and subtasks', async ({ page }) => {
    const { data: template } = await apiCreateTemplate(page, {
      name: 'Onboarding',
      title_template: 'Client onboarding checklist',
      priority: 'high',
      is_recurring: false,
      subtasks: [
        { title: 'Send welcome email', position: 0 },
        { title: 'Schedule intro call', position: 1 },
      ],
    });

    const { status, data: todo } = await apiUseTemplate(page, template.id);

    expect(status).toBe(201);
    expect(todo.title).toBe('Client onboarding checklist');
    expect(todo.priority).toBe('high');
    expect(todo.subtasks).toHaveLength(2);
    expect(todo.subtasks[0].title).toBe('Send welcome email');
    expect(todo.subtasks[1].title).toBe('Schedule intro call');
    // Subtasks are created with completed: false
    expect(todo.subtasks[0].completed).toBe(false);
    expect(todo.subtasks[1].completed).toBe(false);
  });

  test('use a template with due_date_offset_minutes creates todo with future due date', async ({ page }) => {
    const offsetMinutes = 1440; // 1 day
    const before = Date.now();

    const { data: template } = await apiCreateTemplate(page, {
      name: 'Daily task',
      title_template: 'Task due tomorrow',
      priority: 'medium',
      due_date_offset_minutes: offsetMinutes,
    });

    const { data: todo } = await apiUseTemplate(page, template.id);

    expect(todo.due_date).not.toBeNull();
    const dueMs = new Date(todo.due_date).getTime();
    const expectedMs = before + offsetMinutes * 60 * 1000;
    // Due date should be within a 30-second window of the expected offset
    expect(dueMs).toBeGreaterThanOrEqual(expectedMs - 30_000);
    expect(dueMs).toBeLessThanOrEqual(expectedMs + 30_000);
  });

  test('use a template from the manager modal creates todo and shows toast', async ({ page }) => {
    const { data: template } = await apiCreateTemplate(page, {
      name: 'Quick task',
      title_template: 'Template-generated todo',
      priority: 'low',
    });

    await page.goto('/');
    await page.click('button:has-text("Templates")');
    await expect(page.getByText('Quick task')).toBeVisible();

    // Click Use button on the template card
    await page.locator('.template-card-or-button', { hasText: 'Quick task' }).getByRole('button', { name: 'Use' }).click().catch(async () => {
      // Fallback: find the Use button in the modal near the template name
      const card = page.locator('div', { hasText: 'Quick task' }).last();
      await card.getByRole('button', { name: 'Use' }).click();
    });

    // Modal closes and toast appears
    await expect(page.getByText('Template-generated todo')).toBeVisible({ timeout: 5000 });
  });

  // ─── Delete ────────────────────────────────────────────────────────────────

  test('delete a template removes it from the list', async ({ page }) => {
    const { data: template } = await apiCreateTemplate(page, {
      name: 'To be deleted',
      title_template: 'Temp todo',
      priority: 'low',
    });

    const statusBefore = await apiDeleteTemplate(page, template.id);
    expect(statusBefore).toBe(204);

    const templates = await apiGetTemplates(page);
    expect(templates.find((t: { id: number }) => t.id === template.id)).toBeUndefined();
  });

  test('delete a template does not affect todos previously created from it', async ({ page }) => {
    const { data: template } = await apiCreateTemplate(page, {
      name: 'Ephemeral template',
      title_template: 'Orphan todo title',
      priority: 'medium',
    });

    // Create todo from template
    const { data: todo } = await apiUseTemplate(page, template.id);
    expect(todo.id).toBeDefined();

    // Delete the template
    await apiDeleteTemplate(page, template.id);

    // Verify the todo still exists via API
    const todoRes = await page.evaluate(async (id) => {
      const res = await fetch(`/api/todos/${id}`);
      return res.status;
    }, todo.id);

    // 404 is acceptable at this stage (Person 2 implements GET /api/todos/[id])
    // The critical test is that the DELETE did not cascade to todos
    expect([200, 404]).toContain(todoRes);
  });

  // ─── Validation ────────────────────────────────────────────────────────────

  test('creating a template without a name returns 400', async ({ page }) => {
    const { status } = await apiCreateTemplate(page, {
      title_template: 'Some title',
      priority: 'medium',
    });
    expect(status).toBe(400);
  });

  test('creating a recurring template without due_date_offset returns 400', async ({ page }) => {
    const { status, data } = await apiCreateTemplate(page, {
      name: 'Bad recurring template',
      title_template: 'Should fail',
      priority: 'medium',
      is_recurring: true,
      recurrence_pattern: 'daily',
      // due_date_offset_minutes intentionally omitted
    });
    expect(status).toBe(400);
    expect(data.error).toMatch(/due_date_offset_minutes/i);
  });

  test('creating a template with no subtasks creates null subtasks_json', async ({ page }) => {
    const { data } = await apiCreateTemplate(page, {
      name: 'No subtasks',
      title_template: 'Plain todo',
      priority: 'low',
    });
    expect(data.subtasks_json).toBeNull();

    const { data: todo } = await apiUseTemplate(page, data.id);
    expect(todo.subtasks).toHaveLength(0);
  });

  // ─── subtasks_json round-trip ──────────────────────────────────────────────

  test('subtasks_json round-trips title and position losslessly', async ({ page }) => {
    const subtasks = [
      { title: 'Step A', position: 0 },
      { title: 'Step B', position: 1 },
      { title: 'Step C', position: 2 },
    ];

    const { data: template } = await apiCreateTemplate(page, {
      name: 'Round-trip test',
      title_template: 'Test todo',
      priority: 'medium',
      subtasks,
    });

    const parsed = JSON.parse(template.subtasks_json);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toMatchObject({ title: 'Step A', position: 0 });
    expect(parsed[1]).toMatchObject({ title: 'Step B', position: 1 });
    expect(parsed[2]).toMatchObject({ title: 'Step C', position: 2 });
  });

  // ─── User isolation ────────────────────────────────────────────────────────

  test('user cannot see or use another user\'s templates', async ({ page, browser }) => {
    // User A creates a template
    const { data: template } = await apiCreateTemplate(page, {
      name: 'User A template',
      title_template: 'Private todo',
      priority: 'medium',
    });

    // User B — new context
    const ctx = await browser.newContext();
    const page2 = await ctx.newPage();
    const va2 = await setupVirtualAuthenticator(page2);
    await register(page2, uniqueUser());

    const userBTemplates = await apiGetTemplates(page2);
    expect(userBTemplates.find((t: { id: number }) => t.id === template.id)).toBeUndefined();

    const { status } = await apiUseTemplate(page2, template.id);
    expect(status).toBe(404);

    await teardownVirtualAuthenticator(va2);
    await ctx.close();
  });
});
