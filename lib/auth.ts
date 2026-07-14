import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { Session } from './db';

const COOKIE_NAME = 'session';
const EXPIRY = '7d';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

function getSecret(): Uint8Array {
  const raw =
    process.env.JWT_SECRET ??
    (process.env.NODE_ENV !== 'production'
      ? 'dev-secret-do-not-use-in-production-min-32-chars'
      : null);
  if (!raw) throw new Error('JWT_SECRET environment variable is not set');
  return new TextEncoder().encode(raw);
}

export async function createSession(session: Session): Promise<void> {
  const token = await new SignJWT({ userId: session.userId, username: session.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(EXPIRY)
    .sign(getSecret());

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  });
}

export async function getSession(): Promise<Session | null> {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.userId !== 'number' || typeof payload.username !== 'string') {
      return null;
    }
    return { userId: payload.userId, username: payload.username };
  } catch {
    return null;
  }
}

export async function deleteSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
