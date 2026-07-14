import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { challengeStore } from '@/lib/challengeStore';

const RP_ID     = process.env.RP_ID     ?? 'localhost';
const RP_ORIGIN = process.env.RP_ORIGIN ?? 'http://localhost:3000';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const challenge = challengeStore.get(`reg:${username}`);
  if (!challenge) {
    return NextResponse.json({ error: 'Challenge expired or not found' }, { status: 400 });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challenge,
      expectedOrigin: RP_ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    challengeStore.delete(`reg:${username}`);

    let user = userDB.findByUsername(username);
    if (!user) user = userDB.create(username);

    const { credential } = verification.registrationInfo;
    authenticatorDB.create({
      user_id: user.id,
      credential_id: credential.id,
      credential_public_key: Buffer.from(credential.publicKey),
      counter: credential.counter,
    });

    await createSession({ userId: user.id, username: user.username });
    return NextResponse.json({ verified: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Verification failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
