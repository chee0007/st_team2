import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { challengeStore } from '@/lib/challengeStore';

const RP_ID = process.env.NEXT_PUBLIC_RP_ID ?? 'localhost';
const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN ?? 'http://localhost:3000';

export async function POST(request: NextRequest) {
  const { username, response } = await request.json();
  if (!username?.trim()) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }
  const trimmed = username.trim();

  const challenge = challengeStore.get(`reg:${trimmed}`);
  if (!challenge) {
    return NextResponse.json({ error: 'No pending registration' }, { status: 400 });
  }

  const user = userDB.findByUsername(trimmed);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    const { credential } = verification.registrationInfo;
    const credentialId = Buffer.from(credential.id).toString('base64url');
    const publicKey = Buffer.from(credential.publicKey);

    authenticatorDB.create(user.id, credentialId, publicKey, credential.counter ?? 0);
    challengeStore.delete(`reg:${trimmed}`);

    await createSession({ userId: user.id, username: user.username });
    return NextResponse.json({ verified: true });
  } catch (err) {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
