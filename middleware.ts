import { type NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Must match the secret in lib/auth.ts exactly.
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-must-be-at-least-32-characters-long',
);

const PROTECTED_PATHS = ['/', '/calendar'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only enforce on protected paths (exact match).
  if (!PROTECTED_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('session')?.value;

  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch {
      // Token invalid or expired — fall through to redirect.
    }
  }

  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/', '/calendar'],
};
