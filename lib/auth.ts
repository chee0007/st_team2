import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { User, Session } from '@/lib/db';

// ─── Constants ────────────────────────────────────────────────────────────────

const COOKIE_NAME = 'session';
const EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

export const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-must-be-at-least-32-characters-long',
);

// ─── Challenge store (in-memory, single-use, 5-minute TTL) ───────────────────

declare global {
  // eslint-disable-next-line no-var
  var __authChallenges: Map<string, { challenge: string; expiresAt: number }> | undefined;
}

if (!globalThis.__authChallenges) {
  globalThis.__authChallenges = new Map<string, { challenge: string; expiresAt: number }>();
}

const _challenges = globalThis.__authChallenges;

export const challengeStore = {
  save(key: string, challenge: string): void {
    _challenges.set(key, { challenge, expiresAt: Date.now() + 5 * 60 * 1000 });
  },

  /** Consumes (single-use) and returns the challenge, or null if missing/expired. */
  consume(key: string): string | null {
    const entry = _challenges.get(key);
    _challenges.delete(key);
    if (!entry || Date.now() > entry.expiresAt) return null;
    return entry.challenge;
  },
};

// ─── Session helpers ──────────────────────────────────────────────────────────

/**
 * Signs a JWT and stores it as an HTTP-only session cookie.
 * Call this from route handlers after successful auth verification.
 */
export async function createSession(user: User): Promise<void> {
  const token = await new SignJWT({ userId: user.id, username: user.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: EXPIRY_SECONDS,
    path: '/',
  });
}

/**
 * Reads the session cookie and verifies the JWT.
 * Returns the decoded session or null if missing/invalid/expired.
 * Fails closed — never throws.
 */
export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (typeof payload.userId !== 'number' || typeof payload.username !== 'string') return null;

    return { userId: payload.userId, username: payload.username };
  } catch {
    return null;
  }
}

/**
 * Clears the session cookie immediately.
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
