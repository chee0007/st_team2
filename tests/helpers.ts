import { type Page, type CDPSession } from '@playwright/test';

// ─── WebAuthn virtual authenticator ──────────────────────────────────────────

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

// ─── Auth helpers ─────────────────────────────────────────────────────────────

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

// ─── Todo helpers (stub — implemented by Person 2) ────────────────────────────

export async function createTodo(
  page: Page,
  options: { title: string; priority?: string },
): Promise<void> {
  // TODO: Implement when Person 2 builds the main UI
  void page;
  void options;
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
