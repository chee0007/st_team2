import { type NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { userDB } from '@/lib/db';
import { challengeStore } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = String(body.username ?? '').trim();

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  // 409 before generating any challenge — prevents username enumeration
  if (userDB.findByUsername(username)) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }

  const options = await generateRegistrationOptions({
    rpName: process.env.RP_NAME ?? 'Todo App',
    rpID: process.env.RP_ID ?? 'localhost',
    userID: new TextEncoder().encode(username),
    userName: username,
    attestationType: 'none',
    excludeCredentials: [],
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred',
    },
  });

  challengeStore.save(username, options.challenge);

  return NextResponse.json(options);
}
