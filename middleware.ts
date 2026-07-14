import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE = 'session';

function secret(): Uint8Array {
  const raw =
    process.env.JWT_SECRET ??
    (process.env.NODE_ENV !== 'production'
      ? 'dev-secret-do-not-use-in-production-min-32-chars'
      : undefined);
  if (!raw) throw new Error('JWT_SECRET not set');
  return new TextEncoder().encode(raw);
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect root and calendar; let everything else through
  const isProtected =
    pathname === '/' ||
    pathname.startsWith('/calendar');

  if (!isProtected) return NextResponse.next();

  if (!(await isAuthenticated(request))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/calendar/:path*'],
};
