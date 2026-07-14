import { type Page, type CDPSession } from '@playwright/test';

// --- WebAuthn virtual authenticator ------------------------------------------

export interface VirtualAuthenticator {
  client: CDPSession;
  authenticatorId: string;
}

/**
 * Attaches a virtual WebAuthn authenticator to the page via CDP.
 * Call this at the start of each test that performs registration or login.
 */
export async function setupVirtualAuthenticator(page: Page): Promise<VirtualAuthenticator> {
  const client = await page.context().newCDPSession(page);
  await client.send('WebAuthn.enable');
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

export async function teardownVirtualAuthenticator(va: VirtualAuthenticator): Promise<void> {
  await va.client.send('WebAuthn.removeVirtualAuthenticator', {
    authenticatorId: va.authenticatorId,
  });
}

// --- Auth helpers -------------------------------------------------------------

/**
 * Registers a new user. Assumes a virtual authenticator is already attached.
 */
export async function register(page: Page, username: string): Promise<void> {
  await page.goto('/login');
  await page.fill('#username', username);
  await page.click('button:has-text("Register")');
  await page.waitForURL('/');
}

/**
 * Logs in an existing user. Assumes a virtual authenticator is already attached.
 */
export async function login(page: Page, username: string): Promise<void> {
  await page.goto('/login');
  await page.fill('#username', username);
  await page.click('button:has-text("Login")');
  await page.waitForURL('/');
}

// --- Todo helpers (API-based for test data seeding) ---------------------------

export async function createTodo(
  page: Page,
  title: string,
  options?: {
    dueDate?: string;
    priority?: 'high' | 'medium' | 'low';
    isRecurring?: boolean;
    recurrencePattern?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    reminderMinutes?: number;
  },
): Promise<{ todo: { id: number; [key: string]: unknown } }> {
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
  return res.json();
}

export async function addSubtask(
  page: Page,
  todoId: number,
  title: string,
): Promise<unknown> {
  const res = await page.request.post(`/api/todos/${todoId}/subtasks`, {
    data: { title },
  });
  return res.json();
}

export async function createTag(
  page: Page,
  name: string,
  color = '#3B82F6',
): Promise<unknown> {
  const res = await page.request.post('/api/tags', {
    data: { name, color },
  });
  return res.json();
}

export async function createTemplate(
  page: Page,
  options: {
    name: string;
    titleTemplate: string;
    priority?: 'high' | 'medium' | 'low';
    dueDateOffsetMinutes?: number;
  },
): Promise<unknown> {
  const res = await page.request.post('/api/templates', {
    data: {
      name: options.name,
      title_template: options.titleTemplate,
      priority: options.priority ?? 'medium',
      due_date_offset_minutes: options.dueDateOffsetMinutes ?? null,
    },
  });
  return res.json();
}
