import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { challengeStore } from '@/lib/challengeStore';

const RP_NAME = 'Todo App';
const RP_ID = process.env.NEXT_PUBLIC_RP_ID ?? 'localhost';

export async function POST(request: NextRequest) {
  const { username } = await request.json();
  if (!username?.trim()) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }
  const trimmed = username.trim();

  let user = userDB.findByUsername(trimmed);
  if (!user) {
    user = userDB.create(trimmed);
  }

  const authenticators = authenticatorDB.findAllByUser(user.id);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new Uint8Array(Buffer.from(String(user.id))),
    userName: user.username,
    excludeCredentials: authenticators.map((a) => ({
      id: a.credential_id,
      transports: [],
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  challengeStore.set(`reg:${trimmed}`, options.challenge);

  return NextResponse.json({ options, userId: user.id });
}
