import { type Page, type CDPSession } from '@playwright/test';

// ΓöÇΓöÇΓöÇ WebAuthn virtual authenticator ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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

export async function teardownVirtualAuthenticator(va?: VirtualAuthenticator): Promise<void> {
  if (!va) return;

  await va.client.send('WebAuthn.removeVirtualAuthenticator', {
    authenticatorId: va.authenticatorId,
  });
}

// ΓöÇΓöÇΓöÇ Auth helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Registers a new user with the given username.
 * Assumes a virtual authenticator is already attached to the page.
 */
export async function register(page: Page, username: string): Promise<void> {
  await page.goto('/login');
  await page.fill('#username', username);
  await page.click('button:has-text("Register")');
  await page.waitForURL('/');
}

/**
 * Logs in an existing user.
 * Assumes a virtual authenticator is already attached to the page.
 */
export async function login(page: Page, username: string): Promise<void> {
  await page.goto('/login');
  await page.fill('#username', username);
  await page.click('button:has-text("Login")');
  await page.waitForURL('/');
}

// ΓöÇΓöÇΓöÇ Todo helpers (stub ΓÇö implemented by Person 2) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

type CreateTodoOptions = {
  title: string;
  priority?: string;
  dueDate?: string;
};

export async function createTodo(
  page: Page,
  optionsOrTitle: CreateTodoOptions | string,
  extra?: { dueDate?: string; priority?: string },
): Promise<void> {
  const options: CreateTodoOptions =
    typeof optionsOrTitle === 'string'
      ? { title: optionsOrTitle, priority: extra?.priority, dueDate: extra?.dueDate }
      : optionsOrTitle;

  await page.fill('input[placeholder="What do you need to do?"]', options.title);

  if (options.priority) {
    await page.selectOption('section:has-text("Add Todo") select', options.priority);
  }

  if (options.dueDate) {
    const value = options.dueDate.includes('T')
      ? options.dueDate.slice(0, 16)
      : `${options.dueDate}T09:00`;
    await page.fill('input[type="datetime-local"]', value);
  }

  await page.click('button:has-text("Add")');
}

export async function addSubtask(
  page: Page,
  todoTitle: string,
  subtaskTitle: string,
): Promise<void> {
  // TODO: Implement when Person 3 builds subtasks UI
  void page;
  void todoTitle;
  void subtaskTitle;
}

export async function createTag(
  page: Page,
  options: { name: string; color?: string },
): Promise<void> {
  // TODO: Implement when Person 4 builds tags UI
  void page;
  void options;
}

export async function createTemplate(
  page: Page,
  options: { name: string; titleTemplate: string },
): Promise<void> {
  // TODO: Implement when Person 3 builds templates UI
  void page;
  void options;
}

/**
 * Opens the Manage Tags modal.
 * Requires the tags button/link to be visible on the current page.
 */
export async function openManageTags(page: Page): Promise<void> {
  // Try common selectors for the Manage Tags button
  const btn = page
    .getByRole('button', { name: /manage tags/i })
    .or(page.getByText(/manage tags/i));
  await btn.click();
}
