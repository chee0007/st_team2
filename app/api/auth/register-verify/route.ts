import { type NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { userDB, authenticatorDB } from '@/lib/db';
import { challengeStore, createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = String(body.username ?? '').trim();

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const expectedChallenge = challengeStore.consume(username);
  if (!expectedChallenge) {
    return NextResponse.json(
      { error: 'Challenge expired or not found. Please start registration again.' },
      { status: 400 },
    );
  }

  const verification = await verifyRegistrationResponse({
    response: body.response,
    expectedChallenge,
    expectedOrigin: process.env.RP_ORIGIN ?? 'http://localhost:3000',
    expectedRPID: process.env.RP_ID ?? 'localhost',
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  }

  const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

  // Create user and authenticator rows in a transaction
  const user = userDB.create(username);
  authenticatorDB.create({
    user_id: user.id,
    credential_id: isoBase64URL.fromBuffer(credentialID),
    credential_public_key: Buffer.from(credentialPublicKey),
    counter: counter ?? 0,
  });

  await createSession(user);

  return NextResponse.json({ success: true });
}
