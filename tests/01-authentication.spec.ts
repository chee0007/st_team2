import { test, expect } from '@playwright/test';
import {
  setupVirtualAuthenticator,
  teardownVirtualAuthenticator,
  register,
  login,
  type VirtualAuthenticator,
} from './helpers';

// Each test gets its own fresh virtual authenticator + a unique username to avoid collisions.
function uniqueUser() {
  return `user_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

test.describe('Authentication', () => {
  let va: VirtualAuthenticator;

  test.beforeEach(async ({ page }) => {
    va = await setupVirtualAuthenticator(page);
  });

  test.afterEach(async () => {
    await teardownVirtualAuthenticator(va);
  });

  // ─── Registration ─────────────────────────────────────────────────────────

  test('register a new user and redirect to /', async ({ page }) => {
    const username = uniqueUser();
    await register(page, username);
    await expect(page).toHaveURL('/');
  });

  test('register with duplicate username shows error, no navigation', async ({ page }) => {
    const username = uniqueUser();

    // First registration succeeds
    await register(page, username);
    await expect(page).toHaveURL('/');

    // Logout
    await fetch(`${process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'}/api/auth/logout`, {
      method: 'POST',
    });
    await page.goto('/login');

    // Second registration attempt with same username
    await page.fill('#username', username);
    await page.click('button:has-text("Register")');

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('taken');
    await expect(page).toHaveURL('/login');
  });

  // ─── Login ────────────────────────────────────────────────────────────────

  test('login with registered authenticator and redirect to /', async ({ page }) => {
    const username = uniqueUser();

    // Register first
    await register(page, username);
    await expect(page).toHaveURL('/');

    // Logout via API
    await page.evaluate(async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
    });

    // Login
    await login(page, username);
    await expect(page).toHaveURL('/');
  });

  test('login with unregistered username shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#username', 'nobody_' + Date.now());
    await page.click('button:has-text("Login")');

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  // ─── Logout ───────────────────────────────────────────────────────────────

  test('logout redirects to /login and / becomes protected', async ({ page }) => {
    const username = uniqueUser();
    await register(page, username);
    await expect(page).toHaveURL('/');

    // Click logout button
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL('/login');

    // Navigating to / should redirect back to /login
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  // ─── Session persistence ──────────────────────────────────────────────────

  test('session persists across page reload', async ({ page }) => {
    const username = uniqueUser();
    await register(page, username);
    await expect(page).toHaveURL('/');

    await page.reload();
    await expect(page).toHaveURL('/');
    // Should still see the user's name
    await expect(page.getByText(username)).toBeVisible();
  });

  // ─── Protected routes ─────────────────────────────────────────────────────

  test('unauthenticated access to / redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('unauthenticated access to /calendar redirects to /login', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page).toHaveURL('/login');
  });

  test('authenticated access to /login redirects to /', async ({ page }) => {
    const username = uniqueUser();
    await register(page, username);
    await expect(page).toHaveURL('/');

    // Try navigating to /login while authenticated
    await page.goto('/login');
    await expect(page).toHaveURL('/');
  });

  // ─── /api/auth/me ─────────────────────────────────────────────────────────

  test('GET /api/auth/me returns user when authenticated', async ({ page }) => {
    const username = uniqueUser();
    await register(page, username);

    const data = await page.evaluate(async () => {
      const res = await fetch('/api/auth/me');
      return res.json();
    });

    expect(data.username).toBe(username);
  });

  test('GET /api/auth/me returns 401 when not authenticated', async ({ page }) => {
    await page.goto('/login'); // Not authenticated

    const status = await page.evaluate(async () => {
      const res = await fetch('/api/auth/me');
      return res.status;
    });

    expect(status).toBe(401);
  });
});
