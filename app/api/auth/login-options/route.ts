import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { challengeStore } from '@/lib/challengeStore';

const RP_ID = process.env.RP_ID ?? 'localhost';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const user = userDB.findByUsername(username);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const authenticators = authenticatorDB.findByUserId(user.id);
  if (authenticators.length === 0) {
    return NextResponse.json({ error: 'No authenticators registered for this user' }, { status: 400 });
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'preferred',
    allowCredentials: authenticators.map(a => ({
      id: a.credential_id,
      type: 'public-key' as const,
    })),
  });

  challengeStore.set(`auth:${username}`, options.challenge);

  return NextResponse.json(options);
}
