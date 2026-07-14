import { Page, CDPSession } from '@playwright/test';

// ──────────────────────────────────────────────────────────────────────────────
// Virtual authenticator setup
// ──────────────────────────────────────────────────────────────────────────────

export async function setupVirtualAuthenticator(page: Page): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    },
  });
  return cdp;
}

// ──────────────────────────────────────────────────────────────────────────────
// Auth helpers
// ──────────────────────────────────────────────────────────────────────────────

export async function register(page: Page, username: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByRole('button', { name: 'Register' }).click();
  await page.waitForURL('/');
}

export async function login(page: Page, username: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('/');
}

// ──────────────────────────────────────────────────────────────────────────────
// Todo helpers
// ──────────────────────────────────────────────────────────────────────────────

export async function createTodo(page: Page, title: string, options?: {
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string;
}): Promise<void> {
  await page.getByPlaceholder('Add a new todo…').fill(title);
  if (options?.priority) {
    await page.locator('select').first().selectOption(options.priority);
  }
  if (options?.dueDate) {
    await page.locator('input[type="datetime-local"]').fill(options.dueDate);
  }
  await page.getByRole('button', { name: 'Add' }).click();
  await page.waitForSelector(`text=${title}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Tag helpers
// ──────────────────────────────────────────────────────────────────────────────

export async function openManageTags(page: Page): Promise<void> {
  await page.getByRole('button', { name: '+ Manage Tags' }).click();
  await page.waitForSelector('text=Manage Tags');
}

export async function createTag(page: Page, name: string, color?: string): Promise<void> {
  await openManageTags(page);
  await page.getByPlaceholder('Tag name').fill(name);
  if (color) {
    // Fill the hex input
    await page.locator('input.font-mono').last().fill(color);
  }
  await page.getByRole('button', { name: 'Create' }).click();
  await page.waitForSelector(`text=${name}`);
  await page.getByRole('button', { name: 'Close' }).click();
}
