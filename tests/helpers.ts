import { type BrowserContext, type Page } from '@playwright/test';

// ── Virtual WebAuthn authenticator ────────────────────────────────────────────

export async function setupVirtualAuthenticator(context: BrowserContext, page: Page) {
  const client = await context.newCDPSession(page);
  await client.send('WebAuthn.enable', { enableUI: true });
  const { authenticatorId } = await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    },
  });
  return { client, authenticatorId };
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

export async function register(page: Page, context: BrowserContext, username: string) {
  await setupVirtualAuthenticator(context, page);
  await page.goto('/login');
  await page.fill('[data-testid="username-input"]', username);
  await page.click('[data-testid="register-button"]');
  await page.waitForURL('/');
}

export async function login(page: Page, context: BrowserContext, username: string) {
  await setupVirtualAuthenticator(context, page);
  await page.goto('/login');
  await page.fill('[data-testid="username-input"]', username);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/');
}

// ── Data helpers (API-level) ──────────────────────────────────────────────────

export async function createTodo(
  page: Page,
  title: string,
  options?: {
    dueDate?: string;
    priority?: 'high' | 'medium' | 'low';
    isRecurring?: boolean;
    recurrencePattern?: string;
    reminderMinutes?: number;
  }
) {
  const res = await page.request.post('/api/todos', {
    data: {
      title,
      due_date: options?.dueDate ?? null,
      priority: options?.priority ?? 'medium',
      is_recurring: options?.isRecurring ?? false,
      recurrence_pattern: options?.recurrencePattern ?? null,
      reminder_minutes: options?.reminderMinutes ?? null,
    },
  });
  return res.json() as Promise<{ todo: { id: number; [key: string]: unknown } }>;
}

export async function addSubtask(page: Page, todoId: number, title: string) {
  const res = await page.request.post(`/api/todos/${todoId}/subtasks`, {
    data: { title },
  });
  return res.json();
}

export async function createTag(page: Page, name: string, color = '#3B82F6') {
  const res = await page.request.post('/api/tags', {
    data: { name, color },
  });
  return res.json();
}

export async function createTemplate(
  page: Page,
  data: {
    name: string;
    titleTemplate: string;
    priority?: 'high' | 'medium' | 'low';
    dueDateOffsetMinutes?: number;
  }
) {
  const res = await page.request.post('/api/templates', {
    data: {
      name: data.name,
      title_template: data.titleTemplate,
      priority: data.priority ?? 'medium',
      due_date_offset_minutes: data.dueDateOffsetMinutes ?? null,
    },
  });
  return res.json();
}
