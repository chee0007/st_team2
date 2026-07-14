import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { challengeStore } from '@/lib/challengeStore';

const RP_ID = process.env.NEXT_PUBLIC_RP_ID ?? 'localhost';

export async function POST(request: NextRequest) {
  const { username } = await request.json();
  if (!username?.trim()) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }
  const trimmed = username.trim();

  const user = userDB.findByUsername(trimmed);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const authenticators = authenticatorDB.findAllByUser(user.id);
  if (authenticators.length === 0) {
    return NextResponse.json({ error: 'No credentials registered' }, { status: 400 });
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: authenticators.map((a) => ({
      id: a.credential_id,
      transports: [],
    })),
    userVerification: 'preferred',
  });

  challengeStore.set(`login:${trimmed}`, options.challenge);

  return NextResponse.json({ options });
}
