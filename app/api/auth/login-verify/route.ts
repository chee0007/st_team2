import { type NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
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
      { error: 'Challenge expired or not found. Please start login again.' },
      { status: 400 },
    );
  }

  const authenticator = authenticatorDB.findByCredentialId(body.response.id);
  if (!authenticator) {
    return NextResponse.json({ error: 'Authenticator not recognized' }, { status: 401 });
  }

  const verification = await verifyAuthenticationResponse({
    response: body.response,
    expectedChallenge,
    expectedOrigin: process.env.RP_ORIGIN ?? 'http://localhost:3000',
    expectedRPID: process.env.RP_ID ?? 'localhost',
    authenticator: {
      credentialID: isoBase64URL.toBuffer(authenticator.credential_id),
      credentialPublicKey: authenticator.credential_public_key,
      // Always coalesce — counter can be undefined on some authenticator records.
      counter: authenticator.counter ?? 0,
    },
  });

  if (!verification.verified) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 401 });
  }

  // Update counter (clone-attack defence; verifyAuthenticationResponse already validates the increment)
  authenticatorDB.updateCounter(
    authenticator.id,
    verification.authenticationInfo.newCounter ?? 0,
  );

  const user = userDB.findById(authenticator.user_id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  await createSession(user);

  return NextResponse.json({ success: true });
}
