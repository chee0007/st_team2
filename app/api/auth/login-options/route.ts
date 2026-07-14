import { type NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { userDB, authenticatorDB } from '@/lib/db';
import { challengeStore } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = String(body.username ?? '').trim();

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const user = userDB.findByUsername(username);
  if (!user) {
    // Generic message — do not confirm whether the username exists
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }

  const userAuthenticators = authenticatorDB.findByUserId(user.id);
  if (userAuthenticators.length === 0) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }

  const options = await generateAuthenticationOptions({
    rpID: process.env.RP_ID ?? 'localhost',
    allowCredentials: userAuthenticators.map((auth) => ({
      id: auth.credential_id,
      type: 'public-key' as const,
    })),
    userVerification: 'preferred',
  });

  challengeStore.save(username, options.challenge);

  return NextResponse.json(options);
}
