import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { challengeStore } from '@/lib/challengeStore';

const RP_NAME = process.env.RP_NAME ?? 'Todo App';
const RP_ID   = process.env.RP_ID   ?? 'localhost';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const existing = userDB.findByUsername(username);
  const excludeCredentials = existing
    ? authenticatorDB.findByUserId(existing.id).map(a => ({
        id: a.credential_id,
        type: 'public-key' as const,
      }))
    : [];

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: username,
    userDisplayName: username,
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  challengeStore.set(`reg:${username}`, options.challenge);

  return NextResponse.json(options);
}
